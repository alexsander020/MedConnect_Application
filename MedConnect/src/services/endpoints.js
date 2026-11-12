import { api } from './api';

/**
 * Catálogo de chamadas à API, agrupado por domínio.
 * Cada função devolve `response.data` (já desembrulhado) para uso direto no TanStack Query.
 * Contratos: backend/src/docs/swagger.yaml.
 *
 * Listagens paginadas de gestão: { data, total, page, limit, totalPages }.
 */

const data = (p) => p.then((r) => r.data);

/** Remove filtros vazios da query string */
function clean(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
  );
}

export const authApi = {
  forgotPassword: (email) => data(api.post('/auth/forgot-password', { email })),
  resetPassword: (token, newPassword) => data(api.post('/auth/reset-password', { token, newPassword })),
  verifyEmail: (token) => data(api.post('/auth/verify-email', { token })),
  changePassword: (currentPassword, newPassword) =>
    data(api.post('/auth/change-password', { currentPassword, newPassword })),
};

export const publicApi = {
  pharmacies: (params) => data(api.get('/pharmacies/public', { params: clean(params) })),
  consentTerms: () => data(api.get('/consent/terms')),
};

export const supportApi = {
  create: (payload) => data(api.post('/support/tickets', payload)),
  myTickets: () => data(api.get('/support/tickets/my')),
};

export const notificationsApi = {
  list: () => data(api.get('/notifications')),
  markRead: (id) => data(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => data(api.patch('/notifications/read-all')),
};

export const patientApi = {
  me: () => data(api.get('/users/me')),
  updateMe: (payload) => data(api.patch('/users/me', payload)),
  prescriptions: () => data(api.get('/prescriptions/my')),
  prescription: (id) => data(api.get(`/prescriptions/${id}`)),
  prescriptionQuotes: (id) => data(api.get(`/prescriptions/${id}/quotes`)),
  prescriptionViewUrl: (id) => data(api.get(`/prescriptions/${id}/view-url`)),
  /** `config` opcional do axios (ex.: { onUploadProgress }) */
  uploadPrescription: (formData, config = {}) =>
    data(
      api.post('/prescriptions', formData, {
        ...config,
        headers: { 'Content-Type': 'multipart/form-data', ...(config.headers || {}) },
      })
    ),
  orders: () => data(api.get('/orders/my')),
  order: (id) => data(api.get(`/orders/${id}`)),
  acceptQuote: (quoteId) => data(api.post('/orders', { quoteId })),
  review: (payload) => data(api.post('/reviews', payload)),
};

export const privacyApi = {
  consentStatus: () => data(api.get('/consent/status')),
  giveConsent: (consentType) => data(api.post('/consent', { consentType })),
  revokeConsent: (payload) => data(api.post('/consent/revoke', payload)),
  exportMyData: () => data(api.get('/lgpd/export')),
  anonymizeMyAccount: (payload) => data(api.post('/lgpd/anonymize', payload)),
};

export const pharmacyApi = {
  me: () => data(api.get('/pharmacy/me')),
  updateMe: (payload) => data(api.patch('/pharmacy/me', payload)),
  updateHours: (payload) => data(api.put('/pharmacy/me/hours', payload)),
  stats: () => data(api.get('/pharmacy/stats')),
  availablePrescriptions: () => data(api.get('/prescriptions/pharmacy')),
  prescription: (id) => data(api.get(`/prescriptions/${id}`)),
  prescriptionViewUrl: (id) => data(api.get(`/prescriptions/${id}/view-url`)),
  sendQuote: (payload) => data(api.post('/quotes', payload)),
  myQuotes: () => data(api.get('/quotes/my')),
  orders: () => data(api.get('/orders/my')),
  order: (id) => data(api.get(`/orders/${id}`)),
  updateOrderStatus: (id, status) => data(api.patch(`/orders/${id}/status`, { status })),
  reviews: (pharmacyId) => data(api.get(`/reviews/pharmacy/${pharmacyId}`)),
};

export const adminApi = {
  overview: () => data(api.get('/admin/overview')),
  pilotMetrics: () => data(api.get('/admin/pilot-metrics')),
  auditLogs: (params) => data(api.get('/admin/audit-logs', { params: clean(params) })),

  users: (params) => data(api.get('/admin/users', { params: clean(params) })),
  user: (id) => data(api.get(`/admin/users/${id}`)),
  setUserStatus: (id, status, reason) => data(api.patch(`/admin/users/${id}/status`, { status, reason })),

  pharmacies: (params) => data(api.get('/admin/pharmacies', { params: clean(params) })),
  pendingPharmacies: () => data(api.get('/admin/pharmacies/pending')),
  pharmacy: (id) => data(api.get(`/admin/pharmacies/${id}`)),
  verifyPharmacy: (id, approved, rejectionReason) =>
    data(api.patch(`/admin/pharmacies/${id}/verify`, { approved, rejectionReason })),
  setPharmacyStatus: (id, status, reason) => data(api.patch(`/admin/pharmacies/${id}/status`, { status, reason })),

  orders: (params) => data(api.get('/admin/orders', { params: clean(params) })),
  order: (id) => data(api.get(`/admin/orders/${id}`)),
  prescriptions: (params) => data(api.get('/admin/prescriptions', { params: clean(params) })),

  supportTickets: (params) => data(api.get('/admin/support-tickets', { params: clean(params) })),
  supportTicket: (id) => data(api.get(`/admin/support-tickets/${id}`)),
  updateSupportTicket: (id, payload) => data(api.patch(`/admin/support-tickets/${id}`, payload)),
};
