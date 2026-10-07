import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Calendar, ShieldCheck, Zap, Users, ArrowRight, Activity } from 'lucide-react';

import PublicBooking from './pages/PublicBooking.jsx';
import DashboardOverview from './pages/DashboardOverview.jsx';
import DashboardCalendar from './pages/DashboardCalendar.jsx';
import DashboardBookings from './pages/DashboardBookings.jsx';
import DashboardCRM from './pages/DashboardCRM.jsx';
import DashboardServices from './pages/DashboardServices.jsx';
import DashboardBilling from './pages/DashboardBilling.jsx';

function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header / Nav */}
      <header className="glass-panel" style={{ margin: '1rem 2rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BookFlow SaaS
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/dashboard" className="btn btn-secondary">Business Dashboard</Link>
          <Link to="/booking/demo-barber" className="btn btn-primary">Demo Public Booking Page</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="badge badge-confirmed" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
          <Activity size={14} style={{ marginRight: '0.5rem' }} /> Multi-Tenant Architecture with Supabase RLS
        </div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: 1.1, marginBottom: '1.5rem', background: 'linear-gradient(180deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Production-Ready Appointment & Booking Platform
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '750px', margin: '0 auto 2.5rem' }}>
          Complete multi-tenant SaaS built for service businesses. Features strict tenant isolation, zero double-booking concurrency guarantees, CRM analytics, and automated reminders.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '4rem' }}>
          <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Open Business Dashboard <ArrowRight size={18} />
          </Link>
          <Link to="/booking/demo-barber" className="btn btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Test Public Client Booking
          </Link>
        </div>

        {/* Feature Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', textAlign: 'left', marginTop: '3rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <ShieldCheck size={32} color="#6366f1" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Row-Level Security (RLS)</h3>
            <p style={{ color: 'var(--text-muted)' }}>Database-level tenant isolation ensuring Business A can never access or modify Business B's appointments or customer CRM records.</p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <Zap size={32} color="#06b6d4" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Atomic Concurrency Protection</h3>
            <p style={{ color: 'var(--text-muted)' }}>Server-side slot re-validation and transactional locks preventing double-booking when multiple clients submit simultaneously.</p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <Users size={32} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Tenant CRM & Lifetime Value</h3>
            <p style={{ color: 'var(--text-muted)' }}>Centralized customer profiles, booking history, private internal notes, and automated 24-hour appointment reminders.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
        Multi-Tenant Appointment & Booking SaaS — Assessment Submission Version 1.0
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/booking/:slug" element={<PublicBooking />} />
        <Route path="/dashboard" element={<DashboardOverview />} />
        <Route path="/dashboard/calendar" element={<DashboardCalendar />} />
        <Route path="/dashboard/bookings" element={<DashboardBookings />} />
        <Route path="/dashboard/clients" element={<DashboardCRM />} />
        <Route path="/dashboard/services" element={<DashboardServices />} />
        <Route path="/dashboard/billing" element={<DashboardBilling />} />
      </Routes>
    </Router>
  );
}
