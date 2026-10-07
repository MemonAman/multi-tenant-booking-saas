const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { enforceTenantScope } = require('../middleware/tenant');

router.use(requireAuth, enforceTenantScope);

/**
 * GET /api/schedule
 * Retrieves business hours and blocked periods for authenticated tenant
 */
router.get('/', async (req, res) => {
  try {
    const { data: businessHours } = await req.db
      .from('business_hours')
      .select('*')
      .eq('business_id', req.tenantId)
      .order('day_of_week', { ascending: true });

    const { data: blockedPeriods } = await req.db
      .from('blocked_periods')
      .select('*')
      .eq('business_id', req.tenantId)
      .order('starts_at', { ascending: true });

    res.status(200).json({
      data: {
        business_hours: businessHours || [],
        blocked_periods: blockedPeriods || []
      }
    });
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({
      error: {
        message: 'Failed to fetch operating schedule.',
        code: 'SCHEDULE_FETCH_FAILED'
      }
    });
  }
});

/**
 * POST /api/schedule/hours
 * Updates business operating hours for specified day_of_week
 */
router.post('/hours', async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, enabled } = req.body;

    if (day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({
        error: {
          message: 'day_of_week, start_time, and end_time are required.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const { data: updatedHours, error } = await req.db
      .from('business_hours')
      .upsert({
        business_id: req.tenantId,
        day_of_week: parseInt(day_of_week, 10),
        start_time,
        end_time,
        enabled: enabled !== undefined ? Boolean(enabled) : true
      }, { onConflict: 'business_id, day_of_week' })
      .select();

    if (error) throw error;

    res.status(200).json({
      data: updatedHours,
      message: 'Business hours updated successfully.'
    });
  } catch (err) {
    console.error('Error updating business hours:', err);
    res.status(500).json({
      error: {
        message: 'Failed to update operating hours.',
        code: 'HOURS_UPDATE_FAILED'
      }
    });
  }
});

/**
 * POST /api/schedule/blocked
 * Adds a blocked time period for the business or specific provider
 */
router.post('/blocked', async (req, res) => {
  try {
    const { provider_id, starts_at, ends_at, reason } = req.body;

    if (!starts_at || !ends_at) {
      return res.status(400).json({
        error: {
          message: 'starts_at and ends_at timestamps are required.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    if (new Date(ends_at) <= new Date(starts_at)) {
      return res.status(400).json({
        error: {
          message: 'Blocked period ends_at must be strictly after starts_at.',
          code: 'INVALID_TIME_RANGE'
        }
      });
    }

    const { data: blocked, error } = await req.db
      .from('blocked_periods')
      .insert({
        business_id: req.tenantId,
        provider_id: provider_id || null,
        starts_at,
        ends_at,
        reason: reason || 'Business Unavailable'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      data: blocked,
      message: 'Blocked period created successfully.'
    });
  } catch (err) {
    console.error('Error creating blocked period:', err);
    res.status(500).json({
      error: {
        message: 'Failed to create blocked period.',
        code: 'BLOCKED_PERIOD_CREATE_FAILED'
      }
    });
  }
});

module.exports = router;
