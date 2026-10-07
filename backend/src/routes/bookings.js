const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { enforceTenantScope } = require('../middleware/tenant');
const { calculateAvailableSlots } = require('../services/availabilityService');

router.use(requireAuth, enforceTenantScope);

/**
 * GET /api/bookings
 * Returns booking records for authenticated tenant with optional date/status filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, start_date, end_date } = req.query;

    let query = req.db
      .from('bookings')
      .select('*, services(name, duration_minutes, price), clients(name, email, phone)')
      .eq('business_id', req.tenantId)
      .order('starts_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }
    if (start_date) {
      query = query.gte('starts_at', `${start_date}T00:00:00Z`);
    }
    if (end_date) {
      query = query.lte('ends_at', `${end_date}T23:59:59Z`);
    }

    const { data: bookings, error } = await query;
    if (error) throw error;

    res.status(200).json({ data: bookings || [] });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({
      error: {
        message: 'Failed to fetch bookings.',
        code: 'FETCH_BOOKINGS_FAILED'
      }
    });
  }
});

/**
 * GET /api/bookings/:id
 * Fetches booking details and audit event history
 */
router.get('/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;

    const { data: booking, error } = await req.db
      .from('bookings')
      .select('*, services(*), clients(*), providers(*)')
      .eq('id', bookingId)
      .eq('business_id', req.tenantId)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        error: {
          message: 'Booking record not found.',
          code: 'BOOKING_NOT_FOUND'
        }
      });
    }

    // Fetch audit trail events
    const { data: events } = await req.db
      .from('booking_events')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    res.status(200).json({
      data: {
        ...booking,
        audit_events: events || []
      }
    });
  } catch (err) {
    console.error('Error fetching booking detail:', err);
    res.status(500).json({
      error: {
        message: 'Failed to load booking detail.',
        code: 'BOOKING_DETAIL_FAILED'
      }
    });
  }
});

/**
 * PATCH /api/bookings/:id
 * Updates booking status (e.g. 'confirmed', 'cancelled', 'completed', 'no_show')
 */
router.patch('/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          message: `Invalid status. Must be one of: [${validStatuses.join(', ')}]`,
          code: 'INVALID_STATUS'
        }
      });
    }

    const { data: updatedBooking, error } = await req.db
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .eq('business_id', req.tenantId)
      .select()
      .single();

    if (error || !updatedBooking) {
      return res.status(404).json({
        error: {
          message: 'Booking not found or update failed.',
          code: 'BOOKING_UPDATE_FAILED'
        }
      });
    }

    // Record audit event for status change
    await req.db.from('booking_events').insert({
      booking_id: bookingId,
      event_type: `status_changed_to_${status}`,
      actor_id: req.user.id
    });

    res.status(200).json({
      data: updatedBooking,
      message: `Booking status updated to '${status}'.`
    });

  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({
      error: {
        message: 'Failed to update booking status.',
        code: 'STATUS_UPDATE_FAILED'
      }
    });
  }
});

/**
 * POST /api/bookings/:id/reschedule
 * Reschedules appointment to new start time after running full availability check
 */
router.post('/:id/reschedule', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { new_starts_at } = req.body;

    if (!new_starts_at) {
      return res.status(400).json({
        error: {
          message: 'new_starts_at timestamp is required for rescheduling.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Fetch original booking
    const { data: booking } = await req.db
      .from('bookings')
      .select('*, services(duration_minutes)')
      .eq('id', bookingId)
      .eq('business_id', req.tenantId)
      .single();

    if (!booking) {
      return res.status(404).json({
        error: {
          message: 'Booking not found.',
          code: 'BOOKING_NOT_FOUND'
        }
      });
    }

    const durationMinutes = booking.services.duration_minutes;
    const newStartMs = new Date(new_starts_at).getTime();
    const newEndMs = newStartMs + (durationMinutes * 60 * 1000);
    const new_ends_at = new Date(newEndMs).toISOString();

    // Check for conflicting active bookings (excluding the current booking being rescheduled!)
    const { data: conflicts } = await req.db
      .from('bookings')
      .select('id')
      .eq('business_id', req.tenantId)
      .neq('id', bookingId)
      .neq('status', 'cancelled')
      .lt('starts_at', new_ends_at)
      .gt('ends_at', new_starts_at);

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({
        error: {
          message: 'New requested time slot conflicts with another active booking.',
          code: 'RESCHEDULE_SLOT_CONFLICT'
        }
      });
    }

    // Update booking to new time
    const { data: rescheduled, error: updateErr } = await req.db
      .from('bookings')
      .update({
        starts_at: new_starts_at,
        ends_at: new_ends_at,
        status: 'confirmed'
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Record reschedule audit event
    await req.db.from('booking_events').insert({
      booking_id: bookingId,
      event_type: 'rescheduled',
      actor_id: req.user.id,
      metadata: { old_starts_at: booking.starts_at, new_starts_at }
    });

    res.status(200).json({
      data: rescheduled,
      message: 'Appointment rescheduled successfully.'
    });

  } catch (err) {
    console.error('Error rescheduling booking:', err);
    res.status(500).json({
      error: {
        message: 'Failed to reschedule booking.',
        code: 'RESCHEDULE_FAILED'
      }
    });
  }
});

module.exports = router;
