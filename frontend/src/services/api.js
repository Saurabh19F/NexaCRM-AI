import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 6000,
})

const isLikelyJwt = (token) =>
  typeof token === 'string' &&
  token.split('.').length === 3 &&
  !token.includes(' ')

const parseApiError = (err) => {
  const status = err?.response?.status
  const data = err?.response?.data
  if (status === 403) {
    if (typeof data === 'string' && data.trim()) return data.trim()
    if (data && typeof data === 'object') {
      const msg = data.message || data.error
      if (typeof msg === 'string' && msg.trim()) return msg.trim()
    }
    return 'Access denied (403). You may not have permission for this action.'
  }
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (data && typeof data === 'object') {
    const msg = data.message || data.error
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim()
  return 'Request failed. Please try again.'
}

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    let token = null
    try {
      const raw = localStorage.getItem('nexacrm-auth')
      token = raw ? JSON.parse(raw)?.state?.token : null
    } catch {
      token = null
    }

    if (isLikelyJwt(token)) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      delete config.headers.Authorization
    }
    return config
  },
  (err) => Promise.reject(err)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('nexacrm-auth')
      window.location.href = '/login'
    }
    return Promise.reject({
      message: parseApiError(err),
      status: err?.response?.status,
      data: err?.response?.data,
    })
  }
)

// ──────────────────────────────────────────
//  Auth
// ──────────────────────────────────────────
export const authAPI = {
  login:  (data) => api.post('/auth/login', data),
  logout: ()     => api.post('/auth/logout'),
  me:     ()     => api.get('/auth/me'),
  refresh:()     => api.post('/auth/refresh'),
}

// ──────────────────────────────────────────
//  Leads
// ──────────────────────────────────────────
export const leadsAPI = {
  getAll:    (params) => api.get('/leads', { params }),
  getById:   (id)     => api.get(`/leads/${id}`),
  create:    (data)   => api.post('/leads', data),
  update:    (id, d)  => api.put(`/leads/${id}`, d),
  delete:    (id)     => api.delete(`/leads/${id}`),
  bulkDelete:(ids)    => api.post('/leads/bulk-delete', { ids }),
  import:    (file)   => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/leads/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  export:    (params) => api.get('/leads/export', { params, responseType: 'blob' }),
  score:     (id)     => api.post(`/leads/${id}/score`),
}

// ──────────────────────────────────────────
//  Deals / Pipeline
// ──────────────────────────────────────────
export const dealsAPI = {
  getAll:       (params)   => api.get('/deals', { params }),
  getBoard:     (params)   => api.get('/deals/board', { params }),
  getById:      (id)       => api.get(`/deals/${id}`),
  create:       (data)     => api.post('/deals', data),
  update:       (id, d)    => api.put(`/deals/${id}`, d),
  delete:       (id)       => api.delete(`/deals/${id}`),
  moveStage:    (id, stage)=> api.patch(`/deals/${id}/stage`, { stage }),
  getActivities:(id)       => api.get(`/deals/${id}/activities`),
  addActivity:  (id, d)    => api.post(`/deals/${id}/activities`, d),
}

// ──────────────────────────────────────────
//  Customers
// ──────────────────────────────────────────
export const customersAPI = {
  getAll:  (params) => api.get('/customers', { params }),
  getById: (id)     => api.get(`/customers/${id}`),
  create:  (data)   => api.post('/customers', data),
  update:  (id, d)  => api.put(`/customers/${id}`, d),
  delete:  (id)     => api.delete(`/customers/${id}`),
}

// ──────────────────────────────────────────
//  Communications
// ──────────────────────────────────────────
export const commsAPI = {
  getInbox:         (params) => api.get('/communications', { params }),
  getConversation:  (leadId) => api.get(`/communications/lead/${leadId}`),
  send:             (data)   => api.post('/communications/send', data),
  sendEmail:        (data)   => api.post('/communications/email/send', data),
  sendChannel:      (data)   => api.post('/communications/send-channel', data),
  getWhatsAppConversations:  () => api.get('/communications/whatsapp/conversations'),
  getWhatsAppMessages:       (contact) => api.get('/communications/whatsapp/messages', { params: { contact } }),
  getFacebookConversations:  () => api.get('/communications/facebook/conversations'),
  getFacebookMessages:       (psid) => api.get('/communications/facebook/messages', { params: { psid } }),
  aiSuggestReply:   (data)   => api.post('/communications/ai-suggest', data),
}

// ──────────────────────────────────────────
//  Integrations
// ──────────────────────────────────────────
export const integrationsAPI = {
  getAll:      ()           => api.get('/integrations'),
  getById:     (id)         => api.get(`/integrations/${id}`),
  save:        (id, values) => api.put(`/integrations/${id}`, { values }),
  test:        (id, values) => api.post(`/integrations/${id}/test`, { values }),
  disconnect:  (id)         => api.delete(`/integrations/${id}`),
}

// ──────────────────────────────────────────
//  AI Engine
// ──────────────────────────────────────────
export const aiAPI = {
  chat:          (messages) => api.post('/ai/chat', { messages }),
  scoreLead:     (leadId)   => api.post(`/ai/score/${leadId}`),
  predictDeal:   (dealId)   => api.post(`/ai/predict/${dealId}`),
  generateEmail: (data)     => api.post('/ai/generate-email', data),
  getInsights:   ()         => api.get('/ai/insights'),
  nextActions:   (leadId)   => api.get(`/ai/next-actions/${leadId}`),
}

// ──────────────────────────────────────────
//  Automation
// ──────────────────────────────────────────
export const automationAPI = {
  getAll:   ()     => api.get('/workflows'),
  create:   (data) => api.post('/workflows', data),
  update:   (id,d) => api.put(`/workflows/${id}`, d),
  delete:   (id)   => api.delete(`/workflows/${id}`),
  toggle:   (id)   => api.patch(`/workflows/${id}/toggle`),
  getLogs:  (id)   => api.get(`/workflows/${id}/logs`),
}

// ──────────────────────────────────────────
//  Invoices
// ──────────────────────────────────────────
export const invoicesAPI = {
  getAll:    (params) => api.get('/invoices', { params }),
  getById:   (id)     => api.get(`/invoices/${id}`),
  create:    (data)   => api.post('/invoices', data),
  update:    (id, d)  => api.put(`/invoices/${id}`, d),
  delete:    (id)     => api.delete(`/invoices/${id}`),
  markPaid:  (id)     => api.patch(`/invoices/${id}/mark-paid`),
  download:  (id)     => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  sendReminder: (id)  => api.post(`/invoices/${id}/reminder`),
}

// ──────────────────────────────────────────
//  Analytics
// ──────────────────────────────────────────
export const analyticsAPI = {
  getDashboard:   (params) => api.get('/analytics/dashboard', { params }),
  getRevenue:     (params) => api.get('/analytics/revenue', { params }),
  getConversion:  (params) => api.get('/analytics/conversion', { params }),
  getTeam:        (params) => api.get('/analytics/team', { params }),
  getCampaigns:   (params) => api.get('/analytics/campaigns', { params }),
  exportReport:   (params) => api.get('/analytics/export', { params, responseType: 'blob' }),
}

// ──────────────────────────────────────────
//  Team
// ──────────────────────────────────────────
export const teamAPI = {
  getAll:   ()     => api.get('/users'),
  getById:  (id)   => api.get(`/users/${id}`),
  invite:   (data) => api.post('/users/invite', data),
  update:   (id,d) => api.put(`/users/${id}`, d),
  delete:   (id)   => api.delete(`/users/${id}`),
  getRoles: ()     => api.get('/roles'),
}

// ──────────────────────────────────────────
//  Notifications
// ──────────────────────────────────────────
export const notificationsAPI = {
  getAll:    ()    => api.get('/notifications'),
  markRead:  (id)  => api.patch(`/notifications/${id}/read`),
  markAllRead:()   => api.patch('/notifications/mark-all-read'),
  delete:    (id)  => api.delete(`/notifications/${id}`),
}

export default api
