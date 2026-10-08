import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, DollarSign, Users, Activity, Clock, CheckCircle, ArrowUpRight, Plus, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState({
    todayCount: 0,
    upcomingCount: 0,
    totalRevenue: 0,
    clientCount: 0
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolve business slug for public link button & local storage keys
  const tenantRaw = localStorage.getItem('tenant');
  let tenant = null;
  try { tenant = tenantRaw ? JSON.parse(tenantRaw) : null; } catch(e){}
  const businessSlug = tenant?.business?.slug || tenant?.slug || 'demo-barber';

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        let apiBookings = [];
        let apiClients = [];

        try { apiBookings = await api.getBookings(); } catch(e) {}
        try { apiClients = await api.getClients(); } catch(e) {}

        // Load local bookings & clients for tenant slug
        const localBookingsKey = `local_bookings_${businessSlug}`;
        const localClientsKey = `local_clients_${businessSlug}`;

        const localBookings = JSON.parse(localStorage.getItem(localBookingsKey) || '[]');
        const recentBookings = JSON.parse(localStorage.getItem('local_bookings_recent') || '[]');
        const localClients = JSON.parse(localStorage.getItem(localClientsKey) || '[]');
        const recentClients = JSON.parse(localStorage.getItem('local_clients_recent') || '[]');

        // Filter strictly by tenant businessSlug to prevent cross-tenant leakage
        const tenantLocalBookings = [
          ...localBookings,
          ...recentBookings.filter(b => b && b.business_slug === businessSlug)
        ];

        const tenantLocalClients = [
          ...localClients,
          ...recentClients.filter(c => c && c.business_slug === businessSlug)
        ];

        // Merge API & local bookings (unique by id)
        const combinedMap = new Map();
        [...tenantLocalBookings, ...(Array.isArray(apiBookings) ? apiBookings : [])].forEach(b => {
          if (b && b.id && (!b.business_slug || b.business_slug === businessSlug)) {
            combinedMap.set(b.id, b);
          }
        });
        const combinedBookings = Array.from(combinedMap.values());

        const todayStr = new Date().toISOString().split('T')[0];
        const today = combinedBookings.filter(b => b.starts_at && b.starts_at.startsWith(todayStr));
        const upcoming = combinedBookings.filter(b => new Date(b.starts_at) >= new Date() && b.status !== 'cancelled');
        const totalRev = combinedBookings.reduce((sum, b) => sum + (b.price || 0), 0);

        setMetrics({
          todayCount: today.length,
          upcomingCount: upcoming.length,
          totalRevenue: totalRev,
          clientCount: Math.max(combinedBookings.length > 0 ? new Set(combinedBookings.map(b => b.clients?.email)).size : 0, tenantLocalClients.length, Array.isArray(apiClients) ? apiClients.length : 0)
        });

        setRecentBookings(combinedBookings.slice(0, 5));
      } catch (e) {
        console.error('Error loading overview metrics:', e);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [businessSlug]);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Business Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back! Here is your business activity and appointment summary.</p>
        </div>
        <Link to={`/booking/${businessSlug}`} className="btn btn-primary">
          <ExternalLink size={16} /> View Public Booking Page
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Today's Appointments</span>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.todayCount}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Scheduled for today</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Upcoming Bookings</span>
            <div style={{ padding: '0.5rem', background: 'rgba(6,182,212,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.upcomingCount}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active near-term appointments</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Booking Value</span>
            <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--accent-emerald)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>${(metrics.totalRevenue / 100).toFixed(2)}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Gross booking volume</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>CRM Clients</span>
            <div style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--accent-amber)' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.clientCount}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unique customer records</span>
        </div>

      </div>

      {/* Recent Bookings Section */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Bookings</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Latest appointment submissions across your business</p>
          </div>
          <Link to="/dashboard/bookings" className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
            View All Bookings <ArrowUpRight size={16} />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={40} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Bookings Yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Share your public booking page link with customers to start accepting appointments online!
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
                  <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Price</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{b.clients?.name || 'Client'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{b.clients?.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{b.services?.name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(b.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      ${((b.price || 0) / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${b.status}`}>
                        {b.status}
                      </span>
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
