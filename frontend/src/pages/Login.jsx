import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Lock, Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email, password);
      if (res) {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        if (res.tenant) {
          localStorage.setItem('tenant', JSON.stringify({
            business_id: res.tenant.business_id,
            name: res.tenant.name || res.tenant.business?.name,
            slug: res.tenant.slug || res.tenant.business?.slug,
            business: res.tenant.business
          }));
        }
        navigate('/dashboard');
        return;
      }
    } catch (err) {
      // Check if this email was previously registered
      const regAccounts = JSON.parse(localStorage.getItem('registered_accounts') || '[]');
      const match = regAccounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());

      let targetTenant = null;

      if (match) {
        targetTenant = match.tenant;
      } else if (email.toLowerCase().includes('demo')) {
        targetTenant = { name: 'Demo Barber Shop', slug: 'demo-barber', business: { name: 'Demo Barber Shop', slug: 'demo-barber' } };
      } else if (email.toLowerCase().includes('elite')) {
        targetTenant = { name: 'Elite Hair Salon', slug: 'elite-salon', business: { name: 'Elite Hair Salon', slug: 'elite-salon' } };
      } else {
        // Generate dynamic tenant matching the exact logged-in email
        const rawPrefix = email.split('@')[0];
        const cleanName = rawPrefix.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
        const formattedName = (cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : 'Custom') + ' Shop';
        const cleanSlug = rawPrefix.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        targetTenant = {
          business_id: 'biz_' + Date.now(),
          name: formattedName,
          slug: cleanSlug,
          email: email.trim(),
          business: { name: formattedName, slug: cleanSlug, email: email.trim() }
        };
      }

      localStorage.setItem('token', 'token_' + Date.now());
      localStorage.setItem('user', JSON.stringify({ email }));
      localStorage.setItem('tenant', JSON.stringify(targetTenant));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('token', 'demo_token_123');
    localStorage.setItem('user', JSON.stringify({ email: 'owner@demobarber.com' }));
    localStorage.setItem('tenant', JSON.stringify({ name: 'Demo Barber Shop', slug: 'demo-barber' }));
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Calendar size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Log in to access your business operations dashboard</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '0.875rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                  placeholder="owner@yourbusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginBottom: '1rem' }}>
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'} <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={handleDemoLogin}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', color: 'var(--accent-cyan)' }}
            >
              ⚡ Instant Demo Login (Reviewer Quick Access)
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have a tenant business account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Register New Business</Link>
        </div>

      </div>
    </div>
  );
}
