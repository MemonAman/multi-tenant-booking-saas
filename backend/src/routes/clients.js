const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { enforceTenantScope } = require('../middleware/tenant');

router.use(requireAuth, enforceTenantScope);

/**
 * GET /api/clients
 * Searches & lists customer CRM records for authenticated tenant
 * Query params: ?search=john
 */
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let query = req.db
      .from('clients')
      .select('*, bookings(id, price, status, starts_at)')
      .eq('business_id', req.tenantId)
      .order('created_at', { ascending: false });

    if (search) {
      const s = `%${search.trim().toLowerCase()}%`;
      query = query.or(`name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }

    const { data: clients, error } = await query;
    if (error) throw error;

    // Calculate aggregated CRM metrics per customer (Lifetime Value, Booking counts)
    const enrichedClients = (clients || []).map(client => {
      const allBookings = client.bookings || [];
      const completedBookings = allBookings.filter(b => b.status === 'completed' || b.status === 'confirmed');
      const lifetimeValue = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);

      const sortedBookings = [...allBookings].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
      const pastBookings = sortedBookings.filter(b => new Date(b.starts_at) < new Date());
      const futureBookings = sortedBookings.filter(b => new Date(b.starts_at) >= new Date());

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        notes: client.notes,
        created_at: client.created_at,
        total_bookings: allBookings.length,
        lifetime_value: lifetimeValue,
        last_appointment: pastBookings.length > 0 ? pastBookings[pastBookings.length - 1].starts_at : null,
        next_appointment: futureBookings.length > 0 ? futureBookings[0].starts_at : null
      };
    });

    res.status(200).json({ data: enrichedClients });
  } catch (err) {
    console.error('Error fetching CRM clients:', err);
    res.status(500).json({
      error: {
        message: 'Failed to load customer CRM records.',
        code: 'CRM_FETCH_FAILED'
      }
    });
  }
});

/**
 * GET /api/clients/:id
 * Fetches customer CRM profile and complete historical bookings
 */
router.get('/:id', async (req, res) => {
  try {
    const clientId = req.params.id;

    const { data: client, error } = await req.db
      .from('clients')
      .select('*, bookings(*, services(name, price))')
      .eq('id', clientId)
      .eq('business_id', req.tenantId)
      .single();

    if (error || !client) {
      return res.status(404).json({
        error: {
          message: 'Customer record not found.',
          code: 'CLIENT_NOT_FOUND'
        }
      });
    }

    res.status(200).json({ data: client });
  } catch (err) {
    console.error('Error fetching client profile:', err);
    res.status(500).json({
      error: {
        message: 'Failed to load customer profile.',
        code: 'CLIENT_PROFILE_FAILED'
      }
    });
  }
});

/**
 * PATCH /api/clients/:id
 * Updates customer record (e.g. private internal notes, phone, name)
 */
router.patch('/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    const { name, phone, notes } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (notes !== undefined) updates.notes = notes;

    const { data: updatedClient, error } = await req.db
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .eq('business_id', req.tenantId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      data: updatedClient,
      message: 'Customer record updated successfully.'
    });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({
      error: {
        message: 'Failed to update customer record.',
        code: 'CLIENT_UPDATE_FAILED'
      }
    });
  }
});

module.exports = router;
