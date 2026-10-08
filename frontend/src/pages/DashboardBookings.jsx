import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, Filter, Clock, User, Check, X, RefreshCw, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function DashboardBookings() {
  const [statusFilter, setStatusFilter] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const tenantRaw = localStorage.getItem('tenant');
  let tenant = null;
  try { tenant = tenantRaw ? JSON.parse(tenantRaw) : null; } catch(e){}
  const businessSlug = tenant?.business?.slug || tenant?.slug || 'demo-barber';

  useEffect(() => {
    async function loadBookings() {
      try {
        setLoading(true);
        let apiData = [];
        try {
          apiData = await api.getBookings(statusFilter ? { status: statusFilter } : {});
        } catch (e) {}

        const localKey = `local_bookings_${businessSlug}`;
        const localBookings = JSON.parse(localStorage.getItem(localKey) || '[]');
        const recentBookings = JSON.parse(localStorage.getItem('local_bookings_recent') || '[]');

        const tenantLocalBookings = [
          ...localBookings,
          ...recentBookings.filter(b => b && b.business_slug === businessSlug)
        ];

        const combinedMap = new Map();
        [...tenantLocalBookings, ...(Array.isArray(apiData) ? apiData : [])].forEach(b => {
          if (b && b.id && (!b.business_slug || b.business_slug === businessSlug)) {
            combinedMap.set(b.id, b);
          }
        });

        let combined = Array.from(combinedMap.values());
        if (statusFilter) {
          combined = combined.filter(b => b.status === statusFilter);
        }

        setBookings(combined);
      } catch (e) {
        console.error('Error loading bookings list:', e);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, [statusFilter, businessSlug]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.updateBookingStatus(id, newStatus);
    } catch (e) {}

    // Update local state and local storage store
    const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
    setBookings(updated);
    try {
      const localKey = `local_bookings_${businessSlug}`;
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Bookings Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Complete list of customer appointment bookings with status filters.</p>
        </div>

        {/* Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} color="var(--text-muted)" />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {bookings.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <Calendar size={40} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Bookings Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              {statusFilter ? `No bookings with status '${statusFilter}'.` : 'Share your public booking page link with customers to start receiving appointments!'}
            </p>
            <Link to={`/booking/${businessSlug}`} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
              Open Public Booking Page <ExternalLink size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-subtle)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Client</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Service</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Appointment Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Price</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700 }}>{b.clients?.name || 'Client'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{b.clients?.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{b.services?.name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(b.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      ${((b.price || 0) / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${b.status}`}>{b.status}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {b.status !== 'completed' && (
                          <button onClick={() => handleUpdateStatus(b.id, 'completed')} title="Mark Completed" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                            <Check size={14} color="var(--accent-cyan)" />
                          </button>
                        )}
                        {b.status !== 'cancelled' && (
                          <button onClick={() => handleUpdateStatus(b.id, 'cancelled')} title="Cancel Booking" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                            <X size={14} color="var(--accent-rose)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
