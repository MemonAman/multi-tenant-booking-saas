const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed');
  }
  return data.data;
}

export const api = {
  // Public APIs
  getPublicBusiness: (slug) => fetchJSON(`/public/businesses/${slug}`),
  getPublicServices: (slug) => fetchJSON(`/public/businesses/${slug}/services`),
  getPublicAvailability: (slug, serviceId, date) =>
    fetchJSON(`/public/businesses/${slug}/availability?service_id=${serviceId}&date=${date}`),
  createPublicBooking: (slug, payload) =>
    fetchJSON(`/public/businesses/${slug}/bookings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Auth APIs
  login: (email, password) =>
    fetchJSON('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  registerTenant: (payload) =>
    fetchJSON('/auth/register-tenant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => fetchJSON('/auth/me'),

  // Tenant Services & Schedule
  getServices: () => fetchJSON('/services'),
  createService: (payload) =>
    fetchJSON('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateService: (id, payload) =>
    fetchJSON(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getSchedule: () => fetchJSON('/schedule'),
  updateHours: (payload) =>
    fetchJSON('/schedule/hours', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Tenant Bookings
  getBookings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJSON(`/bookings?${query}`);
  },
  updateBookingStatus: (id, status) =>
    fetchJSON(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  rescheduleBooking: (id, newStartsAt) =>
    fetchJSON(`/bookings/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ new_starts_at: newStartsAt }),
    }),

  // Tenant CRM
  getClients: (search = '') => fetchJSON(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getClientDetail: (id) => fetchJSON(`/clients/${id}`),
  updateClient: (id, payload) =>
    fetchJSON(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Billing
  getBillingStatus: () => fetchJSON('/billing/status'),
  initCheckout: () => fetchJSON('/billing/checkout', { method: 'POST' }),

  // Reminders Trigger
  triggerReminders: () => fetchJSON('/jobs/reminders', { method: 'POST' }),
};
