import { create } from 'zustand'
import { leadsAPI } from '../services/api'

const DEFAULT_SLA_MINUTES = 60

const toIso = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const formatCreatedDate = (value) => {
  const iso = toIso(value)
  return iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

const sourceLabelToEnum = (source) => {
  const s = String(source || '').trim().toLowerCase()
  if (s === 'facebook') return 'FACEBOOK'
  if (s === 'instagram') return 'INSTAGRAM'
  if (s === 'linkedin') return 'LINKEDIN'
  if (s === 'website') return 'WEBSITE'
  if (s === 'whatsapp') return 'WHATSAPP'
  if (s === 'google ads') return 'GOOGLE_ADS'
  if (s === 'meta ads') return 'META_ADS'
  if (s === 'referral') return 'REFERRAL'
  if (s === 'email') return 'EMAIL'
  return 'OTHER'
}

const sourceEnumToLabel = (source) => {
  const s = String(source || '').toUpperCase()
  if (s === 'GOOGLE_ADS') return 'Google Ads'
  if (s === 'META_ADS') return 'Meta Ads'
  return s ? `${s.charAt(0)}${s.slice(1).toLowerCase().replace('_', ' ')}` : 'Other'
}

const toFrontendLead = (lead, index = 0) => {
  const now = Date.now()
  const status = String(lead?.status || 'NEW').toLowerCase()
  const existingCreated = toIso(lead?.createdAtTs ?? lead?.createdAt)
  let createdAtTs = existingCreated

  if (!createdAtTs) {
    const offsetMinutes = status === 'new' ? (10 + (index * 23) % 120) : (5 + (index * 11) % 70)
    createdAtTs = new Date(now - offsetMinutes * 60 * 1000).toISOString()
  }

  const followUpSlaMinutes = Number(lead?.followUpSlaMinutes) > 0
    ? Number(lead.followUpSlaMinutes)
    : DEFAULT_SLA_MINUTES

  const firstResponseAtTs = toIso(lead?.firstResponseAtTs)
  const lastActivityAtTs = toIso(lead?.lastActivityAtTs) ?? firstResponseAtTs ?? createdAtTs

  return {
    id: lead?.id,
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    source: sourceEnumToLabel(lead?.source),
    score: String(lead?.score || 'COLD').toLowerCase(),
    status,
    value: Number(lead?.dealValue ?? lead?.value ?? 0),
    assignedTo: lead?.assignedToName || lead?.assignedTo || '',
    assignedToId: lead?.assignedToId || null,
    tags: Array.isArray(lead?.tags) ? lead.tags.join(', ') : (lead?.tags || ''),
    notes: lead?.notes || '',
    createdAt: formatCreatedDate(createdAtTs),
    createdAtTs,
    lastActivityAtTs,
    firstResponseAtTs,
    followUpSlaMinutes,
    reminder15SentAt: toIso(lead?.reminder15SentAt),
    reminder45SentAt: toIso(lead?.reminder45SentAt),
    reminder60SentAt: toIso(lead?.reminder60SentAt),
    escalatedAt: toIso(lead?.escalatedAt),
    reassignedAt: toIso(lead?.reassignedAt),
  }
}

const toBackendLead = (lead) => ({
  name: lead?.name || '',
  email: lead?.email || '',
  phone: lead?.phone || '',
  company: lead?.company || '',
  source: sourceLabelToEnum(lead?.source),
  score: String(lead?.score || 'cold').toUpperCase(),
  status: String(lead?.status || 'new').toUpperCase(),
  dealValue: Number(lead?.value || 0),
  assignedToId: lead?.assignedToId || null,
  tags: String(lead?.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean),
  notes: lead?.notes || null,
})

export const useLeadsStore = create((set, get) => ({
  leads: [],
  loading: false,
  error: null,
  pagination: { page: 0, size: 20, total: 0 },
  filters: { search: '', score: 'all', status: 'all', source: 'all', assignedTo: 'all' },

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  replaceLeads: (leads) =>
    set(() => ({ leads: (leads ?? []).map((lead, i) => toFrontendLead(lead, i)) })),

  patchLeadLocal: (id, patch) =>
    set((s) => ({
      leads: s.leads.map((lead, i) => {
        if (lead.id !== id) return lead
        const next = typeof patch === 'function' ? patch(lead) : { ...lead, ...patch }
        return toFrontendLead(next, i)
      }),
    })),

  fetchLeads: async (params) => {
    set({ loading: true, error: null })
    try {
      const stateFilters = get().filters
      const query = { ...stateFilters, ...params }

      if (query.score === 'all') delete query.score
      if (query.status === 'all') delete query.status
      if (query.source === 'all') delete query.source
      if (query.assignedTo === 'all') delete query.assignedTo
      if (!query.search) delete query.search

      const data = await leadsAPI.getAll(query)
      const leads = (data?.content ?? []).map((lead, i) => toFrontendLead(lead, i))
      set({
        leads,
        pagination: { page: data?.page ?? 0, size: data?.size ?? 20, total: data?.total ?? leads.length },
        loading: false,
      })
      return leads
    } catch (err) {
      set({ loading: false, error: err?.message || 'Failed to fetch leads' })
      throw err
    }
  },

  createLead: async (data) => {
    set({ loading: true, error: null })
    try {
      const created = await leadsAPI.create(toBackendLead(data))
      const lead = toFrontendLead(created)
      set((s) => ({ leads: [lead, ...s.leads], loading: false }))
      return lead
    } catch (err) {
      set({ loading: false, error: err?.message || 'Failed to create lead' })
      throw err
    }
  },

  updateLead: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await leadsAPI.update(id, toBackendLead(data))
      const lead = toFrontendLead(updated)
      set((s) => ({
        leads: s.leads.map((l) => (l.id === id ? lead : l)),
        loading: false,
      }))
      return lead
    } catch (err) {
      set({ loading: false, error: err?.message || 'Failed to update lead' })
      throw err
    }
  },

  deleteLead: async (id) => {
    set({ loading: true, error: null })
    try {
      await leadsAPI.delete(id)
      set((s) => ({ leads: s.leads.filter((l) => l.id !== id), loading: false }))
    } catch (err) {
      set({ loading: false, error: err?.message || 'Failed to delete lead' })
      throw err
    }
  },

  bulkDelete: async (ids) => {
    set({ loading: true, error: null })
    try {
      await leadsAPI.bulkDelete(ids)
      set((s) => ({ leads: s.leads.filter((l) => !ids.includes(l.id)), loading: false }))
    } catch (err) {
      set({ loading: false, error: err?.message || 'Failed to delete leads' })
      throw err
    }
  },
}))
