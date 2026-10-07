const express = require('express');
const router = express.Router();
const env = require('../config/env');
const { supabaseAdmin } = require('../config/supabase');

/**
 * POST /api/jobs/reminders
 * Idempotent 24-hour appointment reminder worker job.
 * Finds upcoming appointments due within 24-25 hours, excluding cancelled ones.
 */
router.post('/reminders', async (req, res) => {
  try {
    // Authenticate cron trigger request
    const authHeader = req.headers.authorization;
    const cronToken = authHeader ? authHeader.replace('Bearer ', '') : '';

    if (cronToken !== env.cronSecret && env.nodeEnv !== 'development') {
      return res.status(401).json({
        error: {
          message: 'Unauthorized cron job execution. Invalid secret.',
          code: 'UNAUTHORIZED_CRON'
        }
      });
    }

    const now = new Date();
    // 24 hours from now window
    const windowStart = new Date(now.getTime() + (23 * 60 * 60 * 1000)).toISOString();
    const windowEnd = new Date(now.getTime() + (25 * 60 * 60 * 1000)).toISOString();

    // Query eligible bookings due for reminder
    const { data: eligibleBookings, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .select('*, businesses(name, email), clients(name, email, phone), services(name)')
      .neq('status', 'cancelled')
      .gte('starts_at', windowStart)
      .lte('starts_at', windowEnd);

    if (bookingErr) throw bookingErr;

    let processedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const booking of eligibleBookings || []) {
      // Check idempotency: Has a reminder already been sent for this booking?
      const { data: existingReminder } = await supabaseAdmin
        .from('reminders')
        .select('id, status')
        .eq('booking_id', booking.id)
        .eq('status', 'sent')
        .maybeSingle();

      if (existingReminder) {
        skippedCount++;
        continue; // Skip - idempotent check passed
      }

      // Simulate sending 24-hour reminder email/SMS
      console.log(`[REMINDER JOB] Dispatched 24h reminder to ${booking.clients.email} for appointment at ${booking.starts_at}`);

      // Upsert reminder status to 'sent'
      await supabaseAdmin.from('reminders').upsert({
        booking_id: booking.id,
        channel: 'email',
        scheduled_for: booking.starts_at,
        sent_at: new Date().toISOString(),
        status: 'sent'
      }, { onConflict: 'booking_id, channel' });

      // Log notification delivery audit
      await supabaseAdmin.from('notification_logs').insert({
        business_id: booking.business_id,
        booking_id: booking.id,
        channel: 'email',
        template: '24h_appointment_reminder',
        status: 'delivered',
        provider_message_id: `msg_mock_${Date.now()}_${booking.id.substring(0, 8)}`
      });

      processedCount++;
      results.push({
        booking_id: booking.id,
        client_email: booking.clients.email,
        starts_at: booking.starts_at,
        status: 'sent'
      });
    }

    res.status(200).json({
      data: {
        total_eligible: (eligibleBookings || []).length,
        processed: processedCount,
        skipped_already_sent: skippedCount,
        details: results
      },
      message: 'Reminder job executed successfully.'
    });

  } catch (err) {
    console.error('Error executing reminder job:', err);
    res.status(500).json({
      error: {
        message: 'Failed to process automated reminders.',
        code: 'REMINDER_JOB_FAILED'
      }
    });
  }
});

module.exports = router;
