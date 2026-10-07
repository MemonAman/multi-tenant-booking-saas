const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register-tenant
 * Onboards a new business owner:
 * 1. Creates Supabase Auth User
 * 2. Inserts Tenant record in `businesses`
 * 3. Links user in `business_members` as 'owner'
 * 4. Initializes default operating hours (Mon-Fri 09:00-17:00)
 * 5. Initializes active subscription
 */
router.post('/register-tenant', async (req, res) => {
  try {
    const { email, password, business_name, slug, timezone, phone } = req.body;

    if (!email || !password || !business_name || !slug) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: email, password, business_name, and slug are required.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Validate slug format (alphanumeric and hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug.toLowerCase())) {
      return res.status(400).json({
        error: {
          message: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.',
          code: 'INVALID_SLUG_FORMAT'
        }
      });
    }

    // Check slug uniqueness
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .single();

    if (existingBusiness) {
      return res.status(409).json({
        error: {
          message: `Business slug '${slug}' is already taken. Please choose another.`,
          code: 'SLUG_TAKEN'
        }
      });
    }

    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        error: {
          message: authError?.message || 'Failed to create authentication user.',
          code: 'AUTH_CREATION_FAILED'
        }
      });
    }

    const userId = authData.user.id;

    // 2. Create Business Tenant Profile
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_user_id: userId,
        name: business_name,
        slug: slug.toLowerCase(),
        timezone: timezone || 'UTC',
        phone: phone || null,
        email: email,
        status: 'active'
      })
      .select()
      .single();

    if (businessError || !business) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({
        error: {
          message: 'Failed to create business record: ' + (businessError?.message || 'Unknown error'),
          code: 'BUSINESS_CREATION_FAILED'
        }
      });
    }

    // 3. Link User as Owner in `business_members`
    await supabaseAdmin
      .from('business_members')
      .insert({
        business_id: business.id,
        user_id: userId,
        role: 'owner'
      });

    // 4. Create Default Business Hours (Mon-Fri 09:00 - 17:00)
    const defaultHours = [1, 2, 3, 4, 5].map(day => ({
      business_id: business.id,
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00',
      enabled: true
    }));

    await supabaseAdmin.from('business_hours').insert(defaultHours);

    // 5. Initialize Subscription Record
    await supabaseAdmin.from('subscriptions').insert({
      business_id: business.id,
      plan: 'monthly_pro',
      status: 'active'
    });

    // Generate session token for immediate login
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    res.status(201).json({
      data: {
        user: {
          id: userId,
          email: email
        },
        business: business,
        session: sessionData?.session || null
      },
      message: 'Business tenant created successfully.'
    });

  } catch (err) {
    console.error('Error in /register-tenant:', err);
    res.status(500).json({
      error: {
        message: 'Internal server error during tenant registration.',
        code: 'REGISTRATION_SERVER_ERROR'
      }
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user and returns session JWT token + tenant metadata
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: 'Email and password are required.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Fetch tenant membership
    const { data: member } = await supabaseAdmin
      .from('business_members')
      .select('business_id, role, businesses(*)')
      .eq('user_id', data.user.id)
      .single();

    res.status(200).json({
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email
        },
        tenant: member ? {
          business_id: member.business_id,
          role: member.role,
          business: member.businesses
        } : null
      }
    });

  } catch (err) {
    console.error('Error in /login:', err);
    res.status(500).json({
      error: {
        message: 'Internal server error during login.',
        code: 'LOGIN_SERVER_ERROR'
      }
    });
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user profile and tenant details
 */
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    data: {
      user: {
        id: req.user.id,
        email: req.user.email
      },
      tenant: {
        business_id: req.tenantId,
        role: req.tenantRole,
        business: req.tenantBusiness
      }
    }
  });
});

module.exports = router;
