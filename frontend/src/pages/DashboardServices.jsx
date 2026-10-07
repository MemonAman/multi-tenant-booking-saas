import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, Scissors, Clock, DollarSign, Edit, Check, X } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardServices() {
  const [services, setServices] = useState([
    { id: '11111111-0000-0000-0000-000000000001', name: 'Classic Haircut', duration_minutes: 30, price: 3500, description: 'Shampoo, haircut, & style', active: true },
    { id: '11111111-0000-0000-0000-000000000002', name: 'Beard Trim & Shape', duration_minutes: 20, price: 2500, description: 'Beard detailing with hot towel', active: true },
    { id: '11111111-0000-0000-0000-000000000003', name: 'Deluxe Combo', duration_minutes: 60, price: 5500, description: 'Haircut + Beard Trim + Facial massage', active: true },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', duration_minutes: 30, price: 3000 });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await api.getServices();
        if (data && data.length > 0) {
          setServices(data);
        }
      } catch (e) {
        // Fallback demo data
      }
    }
    loadServices();
  }, []);

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const newService = await api.createService(formData);
      setServices([...services, newService]);
      setMessage('Service created successfully!');
      setShowModal(false);
    } catch (e) {
      // Demo fallback
      const mockService = {
        id: 'srv_' + Date.now(),
        ...formData,
        price: parseInt(formData.price * 100, 10),
        active: true
      };
      setServices([...services, mockService]);
      setMessage('Service created (Demo Mode)!');
      setShowModal(false);
    }
  };

  const handleToggleActive = async (srv) => {
    const updatedStatus = !srv.active;
    try {
      await api.updateService(srv.id, { active: updatedStatus });
      setServices(services.map(s => s.id === srv.id ? { ...s, active: updatedStatus } : s));
    } catch (e) {
      setServices(services.map(s => s.id === srv.id ? { ...s, active: updatedStatus } : s));
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Service Configuration</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure bookable service offerings, durations, prices, and active statuses.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} /> Add New Service
        </button>
      </div>

      {message && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {message}
        </div>
      )}

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {services.map((srv) => (
          <div key={srv.id} className="glass-panel" style={{ padding: '1.5rem', opacity: srv.active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{srv.name}</h3>
                <span style={{ fontSize: '0.75rem', color: srv.active ? 'var(--accent-emerald)' : 'var(--text-subtle)' }}>
                  {srv.active ? '● Active on Public Page' : '○ Disabled'}
                </span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                ${(srv.price / 100).toFixed(2)}
              </span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{srv.description}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={14} /> {srv.duration_minutes} minutes
              </span>
              <button onClick={() => handleToggleActive(srv)} className="btn btn-secondary" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}>
                {srv.active ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Service Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Service</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateService}>
              <div className="form-group">
                <label className="form-label">Service Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Haircut & Beard Trim"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Service description..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="5"
                    step="5"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Price ($ USD)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0"
                    step="0.01"
                    placeholder="35.00"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Save & Publish Service
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
