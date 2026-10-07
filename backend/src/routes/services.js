const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { enforceTenantScope } = require('../middleware/tenant');

// All routes require authenticated tenant
router.use(requireAuth, enforceTenantScope);

/**
 * GET /api/services
 * Returns all bookable services for the logged-in tenant business
 */
router.get('/', async (req, res) => {
  try {
    const { data: services, error } = await req.db
      .from('services')
      .select('*')
      .eq('business_id', req.tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      data: services || []
    });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({
      error: {
        message: 'Failed to fetch services.',
        code: 'FETCH_SERVICES_FAILED'
      }
    });
  }
});

/**
 * POST /api/services
 * Creates a new service for the authenticated business
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, duration_minutes, price, active } = req.body;

    if (!name || !duration_minutes || price === undefined) {
      return res.status(400).json({
        error: {
          message: 'Missing required service fields: name, duration_minutes, and price are required.',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    if (duration_minutes <= 0) {
      return res.status(400).json({
        error: {
          message: 'Service duration must be a positive integer in minutes.',
          code: 'INVALID_DURATION'
        }
      });
    }

    if (price < 0) {
      return res.status(400).json({
        error: {
          message: 'Service price must be greater than or equal to 0.',
          code: 'INVALID_PRICE'
        }
      });
    }

    const { data: service, error } = await req.db
      .from('services')
      .insert({
        business_id: req.tenantId,
        name,
        description: description || '',
        duration_minutes: parseInt(duration_minutes, 10),
        price: parseInt(price, 10),
        active: active !== undefined ? Boolean(active) : true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      data: service,
      message: 'Service created successfully.'
    });
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({
      error: {
        message: 'Failed to create service.',
        code: 'CREATE_SERVICE_FAILED'
      }
    });
  }
});

/**
 * PATCH /api/services/:id
 * Updates an existing service owned by the authenticated tenant
 */
router.patch('/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { name, description, duration_minutes, price, active } = req.body;

    // Verify service belongs to tenant first
    const { data: existingService } = await req.db
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('business_id', req.tenantId)
      .single();

    if (!existingService) {
      return res.status(404).json({
        error: {
          message: 'Service not found or access denied.',
          code: 'SERVICE_NOT_FOUND'
        }
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (duration_minutes !== undefined) updates.duration_minutes = parseInt(duration_minutes, 10);
    if (price !== undefined) updates.price = parseInt(price, 10);
    if (active !== undefined) updates.active = Boolean(active);

    const { data: updatedService, error } = await req.db
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .eq('business_id', req.tenantId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      data: updatedService,
      message: 'Service updated successfully.'
    });
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({
      error: {
        message: 'Failed to update service.',
        code: 'UPDATE_SERVICE_FAILED'
      }
    });
  }
});

module.exports = router;
