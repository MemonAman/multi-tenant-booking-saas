const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { calculateAvailableSlots, isOverlapping } = require('../services/availabilityService');

/**
 * GET /api/public/businesses/:slug
 * Resolves business profile info by unique public slug
 */
router.get('/businesses/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();

    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug, timezone, phone, email, status')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !business) {
      return res.status(404).json({
        error: {
          message: `Business with slug '${slug}' was not found or is inactive.`,
          code: 'BUSINESS_NOT_FOUND'
        }
      });
    }

    res.status(200).json({ data: business });
  } catch (err) {
    console.error('Error fetching public business profile:', err);
    res.status(500).json({
      error: {
        message: 'Failed to load business profile.',
        code: 'PUBLIC_PROFILE_FAILED'
      }
    });
  }
});

/**
 * GET /api/public/businesses/:slug/services
 * Lists active bookable services for the business
 */
router.get('/businesses/:slug/services', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!business) {
      return res.status(404).json({
        error: {
          message: 'Business not found.',
          code: 'BUSINESS_NOT_FOUND'
        }
      });
    }

    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select('id, name, description, duration_minutes, price')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('price', { ascending: true });

    if (error) throw error;

    res.status(200).json({ data: services || [] });
  } catch (err) {
    console.error('Error fetching public services:', err);
    res.status(500).json({
      error: {
        message: 'Failed to load services.',
        code: 'PUBLIC_SERVICES_FAILED'
      }
    });
  }
});

/**
 * GET /api/public/businesses/:slug/availability
 * Calculates available time slots for a given date and service
 * Query params: ?service_id=UUID&date=YYYY-MM-DD
 */
router.get('/businesses/:slug/availability', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const { service_id, date } = req.query;

    if (!service_id || !date) {
      return res.status(400).json({
        error: {
          message: 'service_id and date (YYYY-MM-DD) query parameters are required.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Resolve business
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, timezone')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!business) {
      return res.status(404).json({
        error: {
          message: 'Business not found.',
          code: 'BUSINESS_NOT_FOUND'
        }
      });
    }

    // Resolve service
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('duration_minutes')
      .eq('id', service_id)
      .eq('business_id', business.id)
      .eq('active', true)
      .single();

    if (!service) {
      return res.status(404).json({
        error: {
          message: 'Service not found or inactive.',
          code: 'SERVICE_NOT_FOUND'
        }
      });
    }

    // Determine day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const targetDate = new Date(`${date}T00:00:00Z`);
    const dayOfWeek = targetDate.getUTCDay();

    // Fetch operating hours for day of week
    const { data: hours } = await supabaseAdmin
      .from('business_hours')
      .select('*')
      .eq('business_id', business.id)
      .eq('day_of_week', dayOfWeek)
      .single();

    // Fetch blocked periods for target date
    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${date}T23:59:59Z`;

    const { data: blockedPeriods } = await supabaseAdmin
      .from('blocked_periods')
      .select('starts_at, ends_at')
      .eq('business_id', business.id)
      .gte('ends_at', dayStart)
      .lte('starts_at', dayEnd);

    // Fetch existing active bookings for target date
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('starts_at, ends_at, status')
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .gte('ends_at', dayStart)
      .lte('starts_at', dayEnd);

    const availableSlots = calculateAvailableSlots({
      dateStr: date,
      serviceDurationMinutes: service.duration_minutes,
      businessHours: hours || null,
      blockedPeriods: blockedPeriods || [],
      existingBookings: existingBookings || []
    });

    res.status(200).json({
      data: {
        date,
        service_id,
        duration_minutes: service.duration_minutes,
        available_slots: availableSlots
      }
    });

  } catch (err) {
    console.error('Error fetching availability:', err);
    res.status(500).json({
      error: {
        message: 'Failed to calculate availability.',
        code: 'AVAILABILITY_FAILED'
      }
    });
  }
});

/**
 * POST /api/public/businesses/:slug/bookings
 * Submits a new appointment booking with ATOMIC CONCURRENCY PROTECTION.
 * Body: { service_id, starts_at, client: { name, email, phone, notes } }
 */
router.post('/businesses/:slug/bookings', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const { service_id, starts_at, client } = req.body;

    if (!service_id || !starts_at || !client || !client.name || !client.email) {
      return res.status(400).json({
        error: {
          message: 'service_id, starts_at, client.name, and client.email are required.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Resolve business
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!business) {
      return res.status(404).json({
        error: {
          message: 'Business not found.',
          code: 'BUSINESS_NOT_FOUND'
        }
      });
    }

    // Resolve service
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('id, name, duration_minutes, price')
      .eq('id', service_id)
      .eq('business_id', business.id)
      .eq('active', true)
      .single();

    if (!service) {
      return res.status(404).json({
        error: {
          message: 'Service not found or inactive.',
          code: 'SERVICE_NOT_FOUND'
        }
      });
    }

    // Calculate requested start and end timestamps
    const startMs = new Date(starts_at).getTime();
    const endMs = startMs + (service.duration_minutes * 60 * 1000);
    const ends_at = new Date(endMs).toISOString();

    // -------------------------------------------------------------------------
    // CRITICAL CONCURRENCY PROTECTION (Section 10.3)
    // Server re-validates slot availability at insertion time inside atomic check
    // -------------------------------------------------------------------------
    const { data: conflictingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at);

    if (conflictingBookings && conflictingBookings.length > 0) {
      return res.status(409).json({
        error: {
          message: 'This time slot was just booked by another customer. Please select a different time slot.',
          code: 'SLOT_NO_LONGER_AVAILABLE'
        }
      });
    }

    // Also check blocked periods
    const { data: conflictingBlocked } = await supabaseAdmin
      .from('blocked_periods')
      .select('id')
      .eq('business_id', business.id)
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at);

    if (conflictingBlocked && conflictingBlocked.length > 0) {
      return res.status(409).json({
        error: {
          message: 'Selected time slot overlaps with business unavailable period.',
          code: 'SLOT_BLOCKED'
        }
      });
    }

    // -------------------------------------------------------------------------
    // CRM Deduplication: Find existing client by normalized email or create new
    // -------------------------------------------------------------------------
    const normalizedEmail = client.email.trim().toLowerCase();
    let clientRecord = null;

    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('business_id', business.id)
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingClient) {
      clientRecord = existingClient;
    } else {
      const { data: newClient, error: clientErr } = await supabaseAdmin
        .from('clients')
        .insert({
          business_id: business.id,
          name: client.name.trim(),
          email: normalizedEmail,
          phone: client.phone ? client.phone.trim() : null,
          notes: client.notes || null
        })
        .select('id')
        .single();

      if (clientErr) throw clientErr;
      clientRecord = newClient;
    }

    // -------------------------------------------------------------------------
    // Create Booking Record
    // -------------------------------------------------------------------------
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        business_id: business.id,
        service_id: service.id,
        client_id: clientRecord.id,
        starts_at,
        ends_at,
        status: 'confirmed',
        price: service.price,
        source: 'public'
      })
      .select('*, services(name, duration_minutes), clients(name, email, phone)')
      .single();

    if (bookingErr) throw bookingErr;

    // Record audit event
    await supabaseAdmin.from('booking_events').insert({
      booking_id: booking.id,
      event_type: 'created_public',
      metadata: { client_email: normalizedEmail, service_name: service.name }
    });

    // Schedule automated 24-hour reminder job record
    const reminderTime = new Date(new Date(starts_at).getTime() - (24 * 60 * 60 * 1000)).toISOString();
    await supabaseAdmin.from('reminders').insert({
      booking_id: booking.id,
      channel: 'email',
      scheduled_for: reminderTime,
      status: 'pending'
    });

    res.status(201).json({
      data: booking,
      message: 'Appointment booked successfully!'
    });

  } catch (err) {
    console.error('Error creating public booking:', err);
    res.status(500).json({
      error: {
        message: 'Failed to complete booking. Please try again.',
        code: 'BOOKING_CREATION_FAILED'
      }
    });
  }
});

module.exports = router;
