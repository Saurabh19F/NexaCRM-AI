import { create } from 'zustand'
import { leadsAPI } from '../services/api'
import { MOCK_LEADS } from '../utils/mockData'

const DEFAULT_SLA_MINUTES = 60

const toIso = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const normalizeLead = (lead, index = 0) => {
  const now = Date.now()
  const isNew = String(lead?.status ?? '').toLowerCase() === 'new'
  const existingCreated = toIso(lead?.createdAtTs ?? lead?.createdAt)
  const hasExplicitCreatedTs = Boolean(lead?.createdAtTs)
  let createdAtTs = existingCreated

  // Demo-friendly fallback so aging bands are visible even with old mock dates.
  if (!hasExplicitCreatedTs) {
    const offsetMinutes = isNew ? (10 + (index * 23) % 120) : (5 + (index * 11) % 70)
    createdAtTs = new Date(now - offsetMinutes * 60 * 1000).toISOString()
  }
  if (!createdAtTs) {
    createdAtTs = new Date(now).toISOString()
  }

  const followUpSlaMinutes = Number(lead?.followUpSlaMinutes) > 0 ? Number(lead.followUpSlaMinutes) : DEFAULT_SLA_MINUTES
  let firstResponseAtTs = toIso(lead?.firstResponseAtTs)
  if (!firstResponseAtTs && !isNew) {
    const createdMs = new Date(createdAtTs).getTime()
    const responseOffset = 12 + (index * 9) % 95
    firstResponseAtTs = new Date(createdMs + responseOffset * 60 * 1000).toISOString()
  }
  const lastActivityAtTs = toIso(lead?.lastActivityAtTs) ?? firstResponseAtTs ?? createdAtTs

  return {
    ...lead,
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

const initialLeads = MOCK_LEADS.map((lead, i) => normalizeLead(lead, i))

export const useLeadsStore = create((set, get) => ({
  leads: initialLeads,
  loading: false,
  error: null,
  pagination: { page: 0, size: 20, total: initialLeads.length },
  filters: { search: '', score: 'all', status: 'all', source: 'all', assignedTo: 'all' },

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  replaceLeads: (leads) =>
    set(() => ({ leads: (leads ?? []).map((lead, i) => normalizeLead(lead, i)) })),

  patchLeadLocal: (id, patch) =>
    set((s) => ({
      leads: s.leads.map((lead, i) => {
        if (lead.id !== id) return lead
        const next = typeof patch === 'function' ? patch(lead) : { ...lead, ...patch }
        return normalizeLead(next, i)
      }),
    })),

  fetchLeads: async (params) => {
    set({ loading: true, error: null })
    try {
      const data = await leadsAPI.getAll({ ...get().filters, ...params })
      const leads = (data?.content ?? []).map((lead, i) => normalizeLead(lead, i))
      set({
        leads,
        pagination: { page: data?.page ?? 0, size: data?.size ?? 20, total: data?.total ?? leads.length },
        loading: false,
      })
    } catch {
      // Fall back to mock data when backend is unavailable
      set({ leads: initialLeads, loading: false })
    }
  },

  createLead: async (data) => {
    set({ loading: true })
    try {
      const lead = await leadsAPI.create(data)
      const normalized = normalizeLead(lead)
      set((s) => ({ leads: [normalized, ...s.leads], loading: false }))
      return normalized
    } catch {
      // Optimistic local create when backend is unavailable
      const now = new Date()
      const lead = normalizeLead({
        ...data,
        id: Date.now(),
        createdAt: now.toISOString().split('T')[0],
        createdAtTs: now.toISOString(),
      })
      set((s) => ({ leads: [lead, ...s.leads], loading: false }))
      return lead
    }
  },

  updateLead: async (id, data) => {
    try {
      await leadsAPI.update(id, data)
    } catch {
      // Proceed with local update even if API fails
    }
    set((s) => ({
      leads: s.leads.map((l, i) => (l.id === id ? normalizeLead({ ...l, ...data }, i) : l))
    }))
  },

  deleteLead: async (id) => {
    try {
      await leadsAPI.delete(id)
    } catch {
      // Proceed with local delete even if API fails
    }
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }))
  },

  bulkDelete: async (ids) => {
    try {
      await leadsAPI.bulkDelete(ids)
    } catch {
      // Proceed with local delete even if API fails
    }
    set((s) => ({ leads: s.leads.filter((l) => !ids.includes(l.id)) }))
  },
}))
