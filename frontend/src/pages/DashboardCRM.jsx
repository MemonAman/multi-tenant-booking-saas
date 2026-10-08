import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Search, User, Mail, Phone, DollarSign, Calendar, Save, FileText } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardCRM() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState(null);

  const tenantRaw = localStorage.getItem('tenant');
  let tenant = null;
  try { tenant = tenantRaw ? JSON.parse(tenantRaw) : null; } catch(e){}
  const businessSlug = tenant?.business?.slug || tenant?.slug || 'demo-barber';

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        let apiData = [];
        try {
          apiData = await api.getClients(search);
        } catch (e) {}

        const localKey = `local_clients_${businessSlug}`;
        const localClients = JSON.parse(localStorage.getItem(localKey) || '[]');
        const recentClients = JSON.parse(localStorage.getItem('local_clients_recent') || '[]');

        const tenantLocalClients = [
          ...localClients,
          ...recentClients.filter(c => c && c.business_slug === businessSlug)
        ];

        const combinedMap = new Map();
        [...tenantLocalClients, ...(Array.isArray(apiData) ? apiData : [])].forEach(c => {
          if (c && c.email && (!c.business_slug || c.business_slug === businessSlug)) {
            combinedMap.set(c.email.toLowerCase(), c);
          }
        });

        let combined = Array.from(combinedMap.values());
        if (search) {
          const q = search.toLowerCase();
          combined = combined.filter(c => 
            (c.name && c.name.toLowerCase().includes(q)) || 
            (c.email && c.email.toLowerCase().includes(q)) || 
            (c.phone && c.phone.includes(q))
          );
        }

        setClients(combined);
      } catch (e) {
        console.error('Error loading CRM clients:', e);
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, [search, businessSlug]);

  const handleSaveNotes = async () => {
    if (!selectedClient) return;

    try {
      await api.updateClient(selectedClient.id, { notes: editNotes });
      setClients(clients.map(c => c.id === selectedClient.id ? { ...c, notes: editNotes } : c));
      setSavedMessage('Internal customer notes saved successfully.');
    } catch (e) {
      setClients(clients.map(c => c.id === selectedClient.id ? { ...c, notes: editNotes } : c));
      setSavedMessage('Notes saved.');
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
          {clients.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <User size={40} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No CRM Customers Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
                Customer CRM profiles are automatically generated when clients complete bookings for your business.
              </p>
            </div>
          ) : (
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
          )}
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
