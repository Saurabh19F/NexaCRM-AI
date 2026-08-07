import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  UserCircle, Phone, Mail, Plus, X, Building2,
  TrendingUp, Calendar, Search, Star,
  ChevronLeft, ChevronRight, Globe, Users, IndianRupee,
  Briefcase, Tag,
} from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import toast from 'react-hot-toast'
import { leadsAPI, customersAPI } from '../../services/api'
import PageHeading from '../ui/PageHeading'
import LoadingState from '../ui/LoadingState'
import { fetchAllPages } from '../../utils/pagination'

/* ── Constants ─────────────────────────────────────────────────── */
const INDUSTRIES = ['Finance', 'IT', 'SaaS', 'Manufacturing', 'Healthcare', 'E-commerce', 'Retail', 'Education', 'Other']
const normalize = (value) => String(value ?? '').trim().toLowerCase()

const SOURCE_COLORS = {
  facebook:   'bg-blue-500',
  instagram:  'bg-pink-500',
  linkedin:   'bg-sky-600',
  website:    'bg-emerald-500',
  whatsapp:   'bg-green-500',
  google_ads: 'bg-yellow-500',
  meta_ads:   'bg-indigo-500',
  referral:   'bg-purple-500',
  email:      'bg-orange-500',
  other:      'bg-slate-500',
}

const SOURCE_LABELS = {
  FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', LINKEDIN: 'LinkedIn',
  WEBSITE: 'Website', WHATSAPP: 'WhatsApp', GOOGLE_ADS: 'Google Ads',
  META_ADS: 'Meta Ads', REFERRAL: 'Referral', EMAIL: 'Email', OTHER: 'Other',
}

const STATUS_BADGES = {
  new:         { label: 'New',         class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  contacted:   { label: 'Contacted',   class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400' },
  qualified:   { label: 'Qualified',   class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  proposal:    { label: 'Proposal',    class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  negotiation: { label: 'Negotiation', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  won:         { label: 'Won',         class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  lost:        { label: 'Lost',        class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
}

const SCORE_BADGES = {
  hot:  { label: 'Hot',  class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  warm: { label: 'Warm', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  cold: { label: 'Cold', class: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400' },
}

function formatCurrency(value) {
  const num = Number(value ?? 0)
  if (num === 0) return '₹0'
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`
  return `₹${num.toLocaleString('en-IN')}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimeAgo(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  try {
    return formatDistanceToNowStrict(date, { addSuffix: true })
  } catch {
    return date.toLocaleDateString('en-IN')
  }
}

const EMPTY_FORM = { name: '', contact: '', email: '', phone: '', industry: 'IT', status: 'active', revenue: '' }

/* ── Add Customer Modal ─────────────────────────────────────────── */
function AddCustomerModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = 'Company name is required'
    if (!form.contact.trim()) e.contact = 'Contact person is required'
    if (!form.email.trim())   e.email   = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.phone.trim())   e.phone   = 'Phone is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    const customer = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      industry: form.industry,
      status: form.status,
      revenue: Number(form.revenue) || 0,
    }
    const saved = await onSave(customer)
    if (saved) {
      toast.success(`${customer.name} added`)
      onClose()
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Add customer"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        className="glass-card w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-brand-500" /> Add Customer
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Company Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Infosys Ltd."
              className={`input mt-1 w-full ${errors.name ? 'ring-2 ring-red-400' : ''}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Primary Contact *</label>
            <input value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Contact person name"
              className={`input mt-1 w-full ${errors.contact ? 'ring-2 ring-red-400' : ''}`} />
            {errors.contact && <p className="text-xs text-red-500 mt-1">{errors.contact}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email *</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@company.com"
                className={`input mt-1 w-full ${errors.email ? 'ring-2 ring-red-400' : ''}`} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone *</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91-98765-43210"
                className={`input mt-1 w-full ${errors.phone ? 'ring-2 ring-red-400' : ''}`} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Industry</label>
              <select value={form.industry} onChange={(e) => set('industry', e.target.value)} className="input mt-1 w-full">
                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input mt-1 w-full">
                <option value="active">Active</option>
                <option value="at-risk">At Risk</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Revenue (₹)</label>
            <input type="number" min={0} value={form.revenue} onChange={(e) => set('revenue', e.target.value)}
              placeholder="0" className="input mt-1 w-full" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 text-sm">Add Customer</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Map a lead from the API into a customer row ───────────────── */
function mapLeadToCustomer(lead) {
  const source = String(lead.source || 'OTHER').toUpperCase()
  const status = normalize(lead.status || 'new')
  const score = normalize(lead.score || 'cold')
  const dealValue = Number(lead.dealValue ?? lead.value ?? 0)
  const revenueValue = Number(lead.revenueValue ?? dealValue)

  return {
    id: lead.id,
    name: lead.name || '(No Name)',
    email: (lead.email || '').trim().toLowerCase(),
    phone: lead.phone || '',
    company: lead.company || '',
    service: lead.service || '',
    specialization: lead.specialization || '',
    source,
    sourceLabel: SOURCE_LABELS[source] || source,
    score,
    status,
    dealValue,
    revenueValue,
    assignedTo: lead.assignedToName || '',
    assignedToId: lead.assignedToId || null,
    tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : (lead.tags || ''),
    notes: lead.notes || '',
    convertedAt: lead.convertedAt || null,
    lastContactedAt: lead.lastContactedAt || null,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    since: formatDate(lead.createdAt),
  }
}

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{value}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function CustomersPage() {
  const [searchParams] = useSearchParams()
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10
  const routeSearch = searchParams.get('search') ?? ''

  useEffect(() => { setSearch(routeSearch) }, [routeSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => { setCurrentPage(0) }, [debouncedSearch, sourceFilter, statusFilter])

  /* ── Fetch ALL leads — these are the real customers ──────────── */
  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      try {
        const result = await fetchAllPages((params) => leadsAPI.getAll(params), 200)
        if (cancelled) return

        const rows = (result.rows || []).map(mapLeadToCustomer)

        // Sort by most recent first
        rows.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return db - da
        })

        setCustomers(rows)
        setSelected((prev) => {
          if (rows.length === 0) return null
          const still = prev && rows.some((c) => c.id === prev.id)
          return still ? rows.find((c) => c.id === prev.id) : rows[0]
        })
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'Failed to load customers')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  /* ── Filtering + pagination ──────────────────────────────────── */
  const filtered = useMemo(() => {
    let rows = customers
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      rows = rows.filter((c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.service || '').toLowerCase().includes(q) ||
        (c.assignedTo || '').toLowerCase().includes(q)
      )
    }
    if (sourceFilter !== 'all') {
      rows = rows.filter((c) => normalize(c.source) === normalize(sourceFilter))
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((c) => c.status === statusFilter)
    }
    return rows
  }, [customers, debouncedSearch, sourceFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  /* ── Sources & statuses for filter dropdowns ─────────────────── */
  const availableSources = useMemo(() => {
    const sources = new Set()
    customers.forEach((c) => { if (c.source) sources.add(c.source) })
    return Array.from(sources).sort()
  }, [customers])

  const availableStatuses = useMemo(() => {
    const statuses = new Set()
    customers.forEach((c) => { if (c.status) statuses.add(c.status) })
    return Array.from(statuses).sort()
  }, [customers])

  /* ── Summary stats from real data ────────────────────────────── */
  const stats = useMemo(() => {
    const total = customers.length
    const totalRevenue = customers.reduce((s, c) => s + (c.dealValue || 0), 0)
    const wonCount = customers.filter((c) => c.status === 'won').length
    const hotCount = customers.filter((c) => c.score === 'hot').length
    return { total, totalRevenue, wonCount, hotCount }
  }, [customers])

  const createCustomer = async (data) => {
    try {
      const payload = {
        name: data.name,
        company: data.name,
        primaryContact: data.contact,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        healthScore: data.status === 'at-risk' ? 40 : 75,
        status: data.status === 'at-risk' ? 'AT_RISK' : 'ACTIVE',
      }
      await customersAPI.create(payload)
      // Reload leads to pick up any changes
      const result = await fetchAllPages((params) => leadsAPI.getAll(params), 200)
      const rows = (result.rows || []).map(mapLeadToCustomer)
      rows.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return db - da
      })
      setCustomers(rows)
      return true
    } catch (err) {
      toast.error(err?.message || 'Failed to create customer')
      return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeading
          title="Customers"
          subtitle={`${stats.total} total · ${stats.wonCount} converted · ${formatCurrency(stats.totalRevenue)} pipeline value`}
        />
        <button onClick={() => setShowAdd(true)} className="btn-primary gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Stats from real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Customers" value={stats.total} color="bg-brand-500" />
        <StatCard icon={IndianRupee} label="Pipeline Value" value={formatCurrency(stats.totalRevenue)} color="bg-emerald-500" />
        <StatCard icon={TrendingUp} label="Converted (Won)" value={stats.wonCount} color="bg-purple-500" />
        <StatCard icon={Star} label="Hot Leads" value={stats.hotCount} color="bg-red-500" />
      </div>

      {/* Search + Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, email, phone, assigned to…"
              className="bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none flex-1"
            />
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="input text-sm py-2 min-w-[130px]">
            <option value="all">All Sources</option>
            {availableSources.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm py-2 min-w-[130px]">
            <option value="all">All Status</option>
            {availableStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_BADGES[s]?.label || s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Customer List ───────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            <LoadingState text="Loading customers…" card />
          ) : paged.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No customers found</p>
              <p className="text-xs mt-1">
                {debouncedSearch || sourceFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try changing the filters'
                  : 'Add leads to see them here'}
              </p>
            </div>
          ) : paged.map((c) => {
            const badge = STATUS_BADGES[c.status]
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full glass-card p-3.5 text-left hover:shadow-card-hover transition-all
                  ${selected?.id === c.id ? 'ring-2 ring-brand-500/50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {c.company ? `${c.company} · ` : ''}{c.email}
                    </p>
                  </div>
                  {badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${badge.class}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {formatCurrency(c.dealValue)}
                  </span>
                  {c.sourceLabel && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${SOURCE_COLORS[normalize(c.source)] || 'bg-slate-500'}`}>
                      {c.sourceLabel}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {c.since}
                  </span>
                </div>
              </button>
            )
          })}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between gap-2">
                <button type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                  disabled={currentPage === 0}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <p className="text-xs text-slate-500">
                  {currentPage + 1} / {totalPages} · {filtered.length} total
                </p>
                <button type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Detail Panel ────────────────────────────────────────── */}
        <div className="lg:col-span-2 glass-card p-6">
          {selected ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {(selected.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{selected.name}</h2>
                  <p className="text-sm text-slate-500">
                    {selected.company && selected.company !== selected.name ? `${selected.company} · ` : ''}
                    Added {selected.since}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {STATUS_BADGES[selected.status] && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGES[selected.status].class}`}>
                        {STATUS_BADGES[selected.status].label}
                      </span>
                    )}
                    {selected.sourceLabel && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${SOURCE_COLORS[normalize(selected.source)] || 'bg-slate-500'}`}>
                        <Globe className="w-3 h-3" /> {selected.sourceLabel}
                      </span>
                    )}
                    {SCORE_BADGES[selected.score] && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${SCORE_BADGES[selected.score].class}`}>
                        <Star className="w-3 h-3" /> {SCORE_BADGES[selected.score].label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Email', value: selected.email || '—', icon: Mail },
                  { label: 'Phone', value: selected.phone || '—', icon: Phone },
                  { label: 'Company', value: selected.company || '—', icon: Building2 },
                  { label: 'Service', value: selected.service || '—', icon: Briefcase },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 break-all">{value}</p>
                  </div>
                ))}
              </div>

              {/* Deal & Revenue Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Deal Value</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {formatCurrency(selected.dealValue)}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Source</p>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-1.5">
                    {selected.sourceLabel || '—'}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Score</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-1.5 capitalize">
                    {selected.score || '—'}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Status</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-1.5 capitalize">
                    {selected.status || '—'}
                  </p>
                </div>
              </div>

              {/* Assigned To + Specialization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected.assignedTo && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Assigned To</p>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selected.assignedTo}</p>
                  </div>
                )}
                {selected.specialization && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Specialization</p>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selected.specialization}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line max-h-32 overflow-y-auto">
                    {selected.notes}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selected.tags && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {String(selected.tags).split(',').filter(Boolean).map((tag) => (
                      <span key={tag.trim()} className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Timeline</p>
                <div className="space-y-2">
                  {selected.convertedAt && (
                    <div className="flex items-start gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">Converted to Customer</p>
                        <p className="text-slate-400">{formatDate(selected.convertedAt)} · {formatTimeAgo(selected.convertedAt)}</p>
                      </div>
                    </div>
                  )}
                  {selected.lastContactedAt && (
                    <div className="flex items-start gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">Last Contacted</p>
                        <p className="text-slate-400">{formatDate(selected.lastContactedAt)} · {formatTimeAgo(selected.lastContactedAt)}</p>
                      </div>
                    </div>
                  )}
                  {selected.createdAt && (
                    <div className="flex items-start gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">Lead Created</p>
                        <p className="text-slate-400">{formatDate(selected.createdAt)} · {formatTimeAgo(selected.createdAt)}</p>
                      </div>
                    </div>
                  )}
                  {!selected.convertedAt && !selected.lastContactedAt && !selected.createdAt && (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                      No timeline data available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a customer to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddCustomerModal
            onClose={() => setShowAdd(false)}
            onSave={createCustomer}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
