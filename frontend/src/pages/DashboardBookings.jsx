import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, Filter, Clock, User, Check, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardBookings() {
  const [statusFilter, setStatusFilter] = useState('');
  const [bookings, setBookings] = useState([
    { id: '1', starts_at: new Date().toISOString(), services: { name: 'Classic Haircut' }, clients: { name: 'John Doe', email: 'john@example.com', phone: '+1 555-0101' }, price: 3500, status: 'confirmed' },
    { id: '2', starts_at: new Date(Date.now() + 86400000).toISOString(), services: { name: 'Beard Trim & Shape' }, clients: { name: 'Sarah Smith', email: 'sarah@example.com' }, price: 2500, status: 'pending' },
    { id: '3', starts_at: new Date(Date.now() - 86400000).toISOString(), services: { name: 'Deluxe Combo' }, clients: { name: 'Michael Brown', email: 'michael@example.com' }, price: 5500, status: 'completed' },
  ]);

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await api.getBookings(statusFilter ? { status: statusFilter } : {});
        if (data && data.length > 0) {
          setBookings(data);
        }
      } catch (e) {
        // Fallback demo data
      }
    }
    loadBookings();
  }, [statusFilter]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.updateBookingStatus(id, newStatus);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (e) {
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
    }
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
                    <div style={{ fontWeight: 700 }}>{b.clients?.name}</div>
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
      </div>
    </DashboardLayout>
  );
}
