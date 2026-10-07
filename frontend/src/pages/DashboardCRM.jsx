import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Search, User, Mail, Phone, DollarSign, Calendar, Save, FileText } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardCRM() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([
    { id: '11111111-9999-0000-0000-000000000001', name: 'John Doe', email: 'john.doe@example.com', phone: '+1 555-0101', notes: 'Prefers low fade. Regular client.', total_bookings: 3, lifetime_value: 11500, last_appointment: '2026-10-01T10:00:00Z', next_appointment: '2026-10-15T10:00:00Z' },
    { id: '22222222-9999-0000-0000-000000000002', name: 'Sarah Smith', email: 'sarah.smith@example.com', phone: '+1 555-0202', notes: 'Allergic to specific shampoos.', total_bookings: 1, lifetime_value: 3500, last_appointment: '2026-09-20T14:00:00Z', next_appointment: null },
  ]);

  const [selectedClient, setSelectedClient] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState(null);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await api.getClients(search);
        if (data && data.length > 0) {
          setClients(data);
        }
      } catch (e) {
        // Fallback demo CRM records
      }
    }
    loadClients();
  }, [search]);

  const handleSaveNotes = async () => {
    if (!selectedClient) return;

    try {
      await api.updateClient(selectedClient.id, { notes: editNotes });
      setClients(clients.map(c => c.id === selectedClient.id ? { ...c, notes: editNotes } : c));
      setSavedMessage('Internal customer notes saved successfully.');
    } catch (e) {
      setClients(clients.map(c => c.id === selectedClient.id ? { ...c, notes: editNotes } : c));
      setSavedMessage('Notes saved (Demo Mode).');
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Customer CRM Directory</h1>
        <p style={{ color: 'var(--text-muted)' }}>Centralized customer records, booking history, lifetime value, and private business notes.</p>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1.5rem', maxWidth: '400px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
        <input
          type="text"
          className="form-input"
          style={{ paddingLeft: '2.75rem' }}
          placeholder="Search by client name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {savedMessage && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {savedMessage}
        </div>
      )}

      {/* Main Grid: CRM Table & Detail Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-subtle)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Contact</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Bookings</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Lifetime Value</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.name}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <div>{c.email}</div>
                      <div>{c.phone || 'No phone'}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{c.total_bookings} appointments</td>
                    <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      ${((c.lifetime_value || 0) / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => {
                          setSelectedClient(c);
                          setEditNotes(c.notes || '');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Detail Drawer */}
        {selectedClient && (
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>{selectedClient.name}</h2>
            
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><Mail size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> {selectedClient.email}</div>
              <div><Phone size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> {selectedClient.phone || 'Not provided'}</div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>LIFETIME VALUE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                ${((selectedClient.lifetime_value || 0) / 100).toFixed(2)}
              </div>
            </div>

            {/* Private Notes Section */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <FileText size={16} /> Private Internal Notes
              </label>
              <textarea
                className="form-textarea"
                rows="4"
                placeholder="Add private notes about preferences, hair type, allergies..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <button onClick={handleSaveNotes} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Save size={16} /> Save Customer Notes
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
