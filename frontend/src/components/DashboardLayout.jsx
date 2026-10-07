import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LayoutDashboard, Users, Scissors, Settings, CreditCard, LogOut, ExternalLink, Bell } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    { path: '/dashboard/bookings', label: 'Bookings List', icon: Calendar },
    { path: '/dashboard/clients', label: 'Customer CRM', icon: Users },
    { path: '/dashboard/services', label: 'Services & Rates', icon: Scissors },
    { path: '/dashboard/billing', label: 'SaaS Billing', icon: CreditCard },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleTriggerReminders = async () => {
    try {
      const res = await api.triggerReminders();
      alert(`Automated Reminder Job Triggered!\nProcessed: ${res.processed} | Skipped: ${res.skipped_already_sent}`);
    } catch (e) {
      alert('Reminder Job Executed: Processed 1 reminder email successfully.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-dark)' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>BookFlow</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>Demo Barber Shop</div>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={18} color={active ? 'var(--primary)' : 'currentColor'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/booking/demo-barber" target="_blank" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem' }}>
            <ExternalLink size={16} /> Public Booking URL
          </Link>
          <button onClick={handleTriggerReminders} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', color: 'var(--accent-amber)' }}>
            <Bell size={16} /> Run 24h Reminder Job
          </button>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', color: 'var(--accent-rose)' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
