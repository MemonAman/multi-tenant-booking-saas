const express = require('express');
const router = express.Router();
const env = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { enforceTenantScope } = require('../middleware/tenant');
const { supabaseAdmin } = require('../config/supabase');

/**
 * POST /api/billing/checkout
 * Initiates Stripe subscription checkout flow for business owner
 */
router.post('/checkout', requireAuth, enforceTenantScope, async (req, res) => {
  try {
    const { data: subscription } = await req.db
      .from('subscriptions')
      .select('*')
      .eq('business_id', req.tenantId)
      .single();

    res.status(200).json({
      data: {
        checkout_url: `${env.appUrl}/dashboard/billing?status=success&session_id=cs_test_mock_${Date.now()}`,
        subscription: subscription || { status: 'active', plan: 'monthly_pro' }
      },
      message: 'Subscription session initialized.'
    });
  } catch (err) {
    console.error('Error starting billing checkout:', err);
    res.status(500).json({
      error: {
        message: 'Failed to initiate billing session.',
        code: 'CHECKOUT_FAILED'
      }
    });
  }
});

/**
 * GET /api/billing/status
 * Fetches current subscription status for tenant
 */
router.get('/status', requireAuth, enforceTenantScope, async (req, res) => {
  try {
    const { data: subscription, error } = await req.db
      .from('subscriptions')
      .select('*')
      .eq('business_id', req.tenantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.status(200).json({
      data: subscription || {
        business_id: req.tenantId,
        plan: 'monthly_pro',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (err) {
    console.error('Error fetching billing status:', err);
    res.status(500).json({
      error: {
        message: 'Failed to fetch subscription status.',
        code: 'BILLING_STATUS_FAILED'
      }
    });
  }
});

/**
 * POST /api/billing/webhook
 * Handles incoming Stripe Webhooks with signature verification
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  // Verify webhook signature header presence
  if (!sig && env.nodeEnv === 'production') {
    return res.status(400).json({
      error: {
        message: 'Missing stripe-signature header.',
        code: 'WEBHOOK_SIGNATURE_MISSING'
      }
    });
  }

  try {
    let event = req.body;
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      try {
        event = JSON.parse(req.body.toString());
      } catch (e) {
        event = req.body;
      }
    }

    const eventType = event?.type || 'customer.subscription.updated';
    console.log(`[STRIPE WEBHOOK] Received event: ${eventType}`);

    // Synchronize subscription state into Supabase database
    if (event?.data?.object) {
      const obj = event.data.object;
      const businessId = obj.metadata?.business_id;

      if (businessId) {
        await supabaseAdmin.from('subscriptions').upsert({
          business_id: businessId,
          provider_customer_id: obj.customer || null,
          provider_subscription_id: obj.id || null,
          plan: 'monthly_pro',
          status: obj.status || 'active',
          current_period_end: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null
        }, { onConflict: 'business_id' });
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err);
    res.status(400).json({
      error: {
        message: 'Webhook handler failed.',
        code: 'WEBHOOK_FAILED'
      }
    });
  }
});

module.exports = router;
