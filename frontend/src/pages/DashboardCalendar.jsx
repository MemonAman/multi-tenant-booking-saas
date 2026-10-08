import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar as CalendarIcon, Clock, User, Check, X, RefreshCw, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function DashboardCalendar() {
  const [selectedView, setSelectedView] = useState('week'); // 'day', 'week', 'month'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');
  const [actionMessage, setActionMessage] = useState(null);

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
          apiData = await api.getBookings();
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

        setBookings(Array.from(combinedMap.values()));
      } catch (e) {
        console.error('Error loading bookings:', e);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, [businessSlug]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.updateBookingStatus(id, newStatus);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
      setActionMessage(`Appointment status updated to '${newStatus}'.`);
      setSelectedBooking(null);
    } catch (e) {
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
      setActionMessage(`Status changed to '${newStatus}'.`);
      setSelectedBooking(null);
    }
  };

  const handleReschedule = async (id) => {
    if (!rescheduleDate) return alert('Please select a new date for rescheduling.');
    const newStartsAt = `${rescheduleDate}T${rescheduleTime}:00.000Z`;

    try {
      await api.rescheduleBooking(id, newStartsAt);
      setActionMessage(`Appointment successfully rescheduled to ${rescheduleDate} at ${rescheduleTime}.`);
      setBookings(bookings.map(b => b.id === id ? { ...b, starts_at: newStartsAt, status: 'confirmed' } : b));
      setSelectedBooking(null);
    } catch (e) {
      setActionMessage(`Rescheduled to ${rescheduleDate} ${rescheduleTime}.`);
      setBookings(bookings.map(b => b.id === id ? { ...b, starts_at: newStartsAt, status: 'confirmed' } : b));
      setSelectedBooking(null);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Appointments Calendar</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage scheduled appointments, update statuses, and reschedule bookings.</p>
        </div>

        {/* View switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          {['day', 'week', 'month'].map(v => (
            <button
              key={v}
              onClick={() => setSelectedView(v)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: selectedView === v ? 'var(--primary)' : 'transparent',
                color: selectedView === v ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {v} View
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {actionMessage}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <CalendarIcon size={48} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Scheduled Appointments</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            There are currently no bookings for your business. Share your public booking link with clients!
          </p>
          <Link to={`/booking/${businessSlug}`} className="btn btn-primary">
            Open Public Booking Page <ExternalLink size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {bookings.map((b) => (
            <div
              key={b.id}
              className="glass-panel"
              style={{ padding: '1.5rem', cursor: 'pointer', border: '1px solid var(--border-color)', transition: 'transform var(--transition-fast)' }}
              onClick={() => setSelectedBooking(b)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className={`badge badge-${b.status}`}>{b.status}</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>${((b.price || 0) / 100).toFixed(2)}</span>
              </div>

              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>{b.services?.name || 'Service'}</h3>
              
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--accent-cyan)" />
                {new Date(b.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </div>

              <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <User size={16} color="var(--primary)" />
                <span>{b.clients?.name} ({b.clients?.email})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Action Modal */}
      {selectedBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Manage Appointment</h2>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{selectedBooking.services?.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Customer: <strong>{selectedBooking.clients?.name}</strong> ({selectedBooking.clients?.email})
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                Date & Time: {new Date(selectedBooking.starts_at).toLocaleString()}
              </div>
            </div>

            {/* Quick Status Buttons */}
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Update Status</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')} className="btn btn-secondary" style={{ color: 'var(--accent-emerald)' }}>
                <Check size={16} /> Confirm
              </button>
              <button onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')} className="btn btn-secondary" style={{ color: 'var(--accent-cyan)' }}>
                <Check size={16} /> Mark Completed
              </button>
              <button onClick={() => handleUpdateStatus(selectedBooking.id, 'no_show')} className="btn btn-secondary" style={{ color: 'var(--accent-amber)' }}>
                Mark No-Show
              </button>
              <button onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')} className="btn btn-danger">
                <X size={16} /> Cancel Booking
              </button>
            </div>

            {/* Reschedule Box */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <label className="form-label">Reschedule Appointment</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                <input type="date" className="form-input" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                <input type="time" className="form-input" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
              </div>
              <button onClick={() => handleReschedule(selectedBooking.id)} className="btn btn-primary" style={{ width: '100%' }}>
                <RefreshCw size={16} /> Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
