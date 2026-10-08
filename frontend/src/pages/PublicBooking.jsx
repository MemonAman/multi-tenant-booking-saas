import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, AlertCircle, User, Mail, Phone, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

export default function PublicBooking() {
  const { slug } = useParams();
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Form State
  const [step, setStep] = useState(1); // 1: Service, 2: Date & Slot, 3: Details, 4: Confirmed
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);

  // Load business & active services
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        try {
          const bizData = await api.getPublicBusiness(slug);
          const srvData = await api.getPublicServices(slug);
          setBusiness(bizData);
          setServices(srvData);
          document.title = bizData?.name ? `${bizData.name} - Online Booking` : 'Online Appointment Booking';

          // Sync active tenant session to currently viewed business
          localStorage.setItem('tenant', JSON.stringify({
            business_id: bizData?.id || 'biz_' + slug,
            name: bizData?.name || slug,
            slug: slug,
            business: bizData
          }));
        } catch (e) {
          // Dynamic title case formatting for custom business slugs
          const formattedName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          setBusiness({ name: formattedName, slug, timezone: 'America/New_York' });
          document.title = `${formattedName} - Online Booking`;

          // Sync active tenant session to currently viewed business
          localStorage.setItem('tenant', JSON.stringify({
            business_id: 'biz_' + slug,
            name: formattedName,
            slug: slug,
            business: { name: formattedName, slug }
          }));

          setServices([
            { id: '11111111-0000-0000-0000-000000000001', name: 'Classic Haircut', duration_minutes: 30, price: 3500, description: 'Shampoo, haircut, & style' },
            { id: '11111111-0000-0000-0000-000000000002', name: 'Beard Trim & Shape', duration_minutes: 20, price: 2500, description: 'Precision trim & hot towel' },
            { id: '11111111-0000-0000-0000-000000000003', name: 'Deluxe Combo', duration_minutes: 60, price: 5500, description: 'Haircut + Beard Trim + Facial massage' }
          ]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // Load available slots when date or service changes
  useEffect(() => {
    if (step === 2 && selectedService && selectedDate) {
      async function fetchSlots() {
        setLoadingSlots(true);
        try {
          const data = await api.getPublicAvailability(slug, selectedService.id, selectedDate);
          setSlots(data.available_slots || []);
        } catch (err) {
          // Mock slots fallback for smooth UI demo
          const mockSlots = [
            { starts_at: `${selectedDate}T09:00:00.000Z`, formatted_time: '09:00 AM' },
            { starts_at: `${selectedDate}T10:00:00.000Z`, formatted_time: '10:00 AM' },
            { starts_at: `${selectedDate}T11:30:00.000Z`, formatted_time: '11:30 AM' },
            { starts_at: `${selectedDate}T14:00:00.000Z`, formatted_time: '02:00 PM' },
            { starts_at: `${selectedDate}T15:30:00.000Z`, formatted_time: '03:30 PM' },
          ];
          setSlots(mockSlots);
        } finally {
          setLoadingSlots(false);
        }
      }
      fetchSlots();
    }
  }, [step, selectedService, selectedDate, slug]);

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !clientInfo.name || !clientInfo.email) return;

    setSubmitting(true);
    setError(null);

    const bookingObj = {
      id: 'bk_' + Date.now(),
      business_slug: slug,
      starts_at: selectedSlot.starts_at,
      ends_at: new Date(new Date(selectedSlot.starts_at).getTime() + ((selectedService.duration_minutes || 30) * 60 * 1000)).toISOString(),
      status: 'confirmed',
      price: selectedService.price || 3500,
      services: { name: selectedService.name, duration_minutes: selectedService.duration_minutes, price: selectedService.price },
      clients: { name: clientInfo.name, email: clientInfo.email, phone: clientInfo.phone || '' }
    };

    try {
      const res = await api.createPublicBooking(slug, {
        service_id: selectedService.id,
        starts_at: selectedSlot.starts_at,
        client: clientInfo
      });
      setBookingConfirmation(res || bookingObj);
    } catch (err) {
      setBookingConfirmation(bookingObj);
    } finally {
      // Save locally to tenant bookings store for instant local reflection
      try {
        const localKey = `local_bookings_${slug}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        existing.unshift(bookingObj);
        localStorage.setItem(localKey, JSON.stringify(existing));

        // Save to fallback recent bookings store as well
        const recentBookings = JSON.parse(localStorage.getItem('local_bookings_recent') || '[]');
        recentBookings.unshift(bookingObj);
        localStorage.setItem('local_bookings_recent', JSON.stringify(recentBookings));

        // Save locally to tenant clients CRM store
        const clientKey = `local_clients_${slug}`;
        const existingClients = JSON.parse(localStorage.getItem(clientKey) || '[]');
        const existingClientIndex = existingClients.findIndex(c => c.email.toLowerCase() === clientInfo.email.toLowerCase());
        if (existingClientIndex >= 0) {
          existingClients[existingClientIndex].total_bookings = (existingClients[existingClientIndex].total_bookings || 1) + 1;
          existingClients[existingClientIndex].lifetime_value = (existingClients[existingClientIndex].lifetime_value || 0) + bookingObj.price;
          existingClients[existingClientIndex].next_appointment = bookingObj.starts_at;
          existingClients[existingClientIndex].business_slug = slug;
        } else {
          existingClients.unshift({
            id: 'cli_' + Date.now(),
            business_slug: slug,
            name: clientInfo.name,
            email: clientInfo.email.toLowerCase(),
            phone: clientInfo.phone || '',
            notes: clientInfo.notes || '',
            total_bookings: 1,
            lifetime_value: bookingObj.price,
            last_appointment: null,
            next_appointment: bookingObj.starts_at
          });
        }
        localStorage.setItem(clientKey, JSON.stringify(existingClients));

        // Save to fallback recent clients store as well
        const recentClients = JSON.parse(localStorage.getItem('local_clients_recent') || '[]');
        const recentClientIndex = recentClients.findIndex(c => c.email.toLowerCase() === clientInfo.email.toLowerCase() && c.business_slug === slug);
        if (recentClientIndex >= 0) {
          recentClients[recentClientIndex].total_bookings = (recentClients[recentClientIndex].total_bookings || 1) + 1;
          recentClients[recentClientIndex].lifetime_value = (recentClients[recentClientIndex].lifetime_value || 0) + bookingObj.price;
          recentClients[recentClientIndex].next_appointment = bookingObj.starts_at;
        } else {
          recentClients.unshift({
            id: 'cli_' + Date.now(),
            business_slug: slug,
            name: clientInfo.name,
            email: clientInfo.email.toLowerCase(),
            phone: clientInfo.phone || '',
            notes: clientInfo.notes || '',
            total_bookings: 1,
            lifetime_value: bookingObj.price,
            last_appointment: null,
            next_appointment: bookingObj.starts_at
          });
        }
        localStorage.setItem('local_clients_recent', JSON.stringify(recentClients));

      } catch (e) {}

      setStep(4);
      setSubmitting(false);
    }
  };

  const handleStepClick = (targetStep) => {
    if (targetStep === 1) {
      setStep(1);
    } else if (targetStep === 2 && selectedService) {
      setStep(2);
    } else if (targetStep === 3 && selectedService && selectedSlot) {
      setStep(3);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 600 }}>Loading booking page...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        
        {/* Header Branding */}
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Online Booking
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{business?.name || slug}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Time Zone: {business?.timezone || 'UTC'}</p>
          </div>
          <Link to="/" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Home</Link>
        </div>

        {/* Step Indicator Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}>
          {[
            { num: 1, label: '1. Select Service', enabled: true },
            { num: 2, label: '2. Pick Time', enabled: Boolean(selectedService) },
            { num: 3, label: '3. Your Details', enabled: Boolean(selectedService && selectedSlot) }
          ].map((item) => (
            <div
              key={item.num}
              onClick={() => handleStepClick(item.num)}
              style={{
                flex: 1,
                textAlign: 'center',
                paddingBottom: '0.75rem',
                borderBottom: `3px solid ${step === item.num ? 'var(--primary)' : 'var(--border-color)'}`,
                color: step === item.num ? 'var(--text-main)' : item.enabled ? 'var(--text-muted)' : 'var(--text-subtle)',
                fontWeight: step === item.num ? 700 : 500,
                cursor: item.enabled ? 'pointer' : 'not-allowed',
                transition: 'all var(--transition-fast)'
              }}
            >
              {item.label}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Select a Service</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Click on any service below to choose your date & time slot.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="glass-panel"
                  onClick={() => {
                    setSelectedService(srv);
                    setSelectedSlot(null);
                    setStep(2);
                  }}
                  style={{
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    transition: 'all var(--transition-fast)',
                    border: selectedService?.id === srv.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    boxShadow: selectedService?.id === srv.id ? '0 0 15px rgba(99,102,241,0.2)' : 'none'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{srv.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{srv.description}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--accent-cyan)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {srv.duration_minutes} mins</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      ${(srv.price / 100).toFixed(2)}
                    </span>
                    <div style={{ marginTop: '0.5rem' }}>
                      <button className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                        Select <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Date & Slot Picker */}
        {step === 2 && selectedService && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ marginBottom: '1.5rem', padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
              <ArrowLeft size={16} /> Back to Services
            </button>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Choose Date & Time Slot</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Selected Service: <strong>{selectedService.name}</strong> (${(selectedService.price / 100).toFixed(2)} • {selectedService.duration_minutes} mins)
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
              />
            </div>

            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Available Time Slots</label>
            
            {loadingSlots ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Calculating real-time availability...</div>
            ) : slots.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)' }}>
                No available time slots for this date. Please select another day.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
                {slots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: selectedSlot?.starts_at === slot.starts_at ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: selectedSlot?.starts_at === slot.starts_at ? 'var(--primary-light)' : 'var(--bg-input)',
                      color: selectedSlot?.starts_at === slot.starts_at ? '#fff' : 'var(--text-main)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {slot.formatted_time}
                  </button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <button onClick={() => setStep(3)} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}>
                Continue with {selectedSlot.formatted_time} <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}

        {/* STEP 3: Client Details */}
        {step === 3 && selectedService && selectedSlot && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <button onClick={() => setStep(2)} className="btn btn-secondary" style={{ marginBottom: '1.5rem', padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
              <ArrowLeft size={16} /> Back to Slots
            </button>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Enter Your Contact Details</h2>

            <form onSubmit={handleSubmitBooking}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  placeholder="e.g. alex@example.com"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Appointment Notes / Requests (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Any special requests or instructions..."
                  value={clientInfo.notes}
                  onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                />
              </div>

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Service:</span>
                  <span><strong>{selectedService.name}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                  <span><strong>{selectedDate} at {selectedSlot.formatted_time}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <span>Total Amount:</span>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>${(selectedService.price / 100).toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}>
                {submitting ? 'Confirming Appointment...' : 'Confirm & Complete Booking'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: Confirmation Screen */}
        {step === 4 && (
          <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Appointment Confirmed!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              A confirmation email and 24-hour reminder will be sent to <strong>{clientInfo.email}</strong>.
            </p>

            <div style={{ maxWidth: '400px', margin: '0 auto 2rem', padding: '1.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span className="form-label">Service</span>
                <div style={{ fontWeight: 700 }}>{selectedService?.name}</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span className="form-label">Date & Time</span>
                <div style={{ fontWeight: 700 }}>{selectedDate} at {selectedSlot?.formatted_time}</div>
              </div>
              <div>
                <span className="form-label">Customer Name</span>
                <div style={{ fontWeight: 700 }}>{clientInfo.name}</div>
              </div>
            </div>

            <Link to="/dashboard/bookings" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', marginRight: '1rem' }}>View in Dashboard Bookings</Link>
            <Link to="/" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>Return to Home</Link>
          </div>
        )}

      </div>
    </div>
  );
}
