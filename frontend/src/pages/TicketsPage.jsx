import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LifeBuoy,
  RefreshCw,
  Search,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Tag,
  User,
  MessageSquare,
  Pencil,
  ChevronRight,
  Filter,
  Hash,
  Calendar,
  Send,
  Lock,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeading from '../components/ui/PageHeading'
import { ticketsAPI, teamAPI } from '../services/api'

// ── Helpers ─────────────────────────────────────────────────────
const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatTicketNumber = (num) => {
  if (!num) return 'TKT-0000'
  return `TKT-${String(num).padStart(4, '0')}`
}

const truncate = (str, max = 120) => {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

// ── Constants ──────────────────────────────────────────────────
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const CATEGORY_OPTIONS = ['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'BILLING', 'OTHER']

const PRIORITY_COLORS = {
  URGENT: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  MEDIUM: 'bg-brand-100 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400',
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const STATUS_COLORS = {
  OPEN: 'bg-brand-100 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const CATEGORY_COLORS = {
  BUG: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
  FEATURE_REQUEST: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
  SUPPORT: 'bg-brand-100 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400',
  BILLING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  OTHER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const EMPTY_FORM = {
  subject: '',
  description: '',
  category: 'SUPPORT',
  priority: 'MEDIUM',
  assignedTo: '',
  tags: '',
  customerEmail: '',
}

// ── Skeleton ────────────────────────────────────────────────────
const Skeleton = ({ count = 4, h = 'h-24' }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div key={i} className={`${h} animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60`} />
    ))}
  </div>
)

// ── KPI Card ────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, color = 'text-brand-500', sub }) => (
  <div className="kpi-card">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
      {Icon && <Icon className={`h-4.5 w-4.5 ${color}`} />}
    </div>
    <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
    {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
  </div>
)

// ── Create / Edit Modal ─────────────────────────────────────────
function TicketModal({ open, onClose, form, setForm, onSubmit, saving, teamMembers, isEdit }) {
  if (!open) return null

  const updateField = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? 'Edit Ticket' : 'Create Ticket'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Subject</label>
            <input name="subject" value={form.subject} onChange={updateField} className="input" required placeholder="Brief summary of the issue" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Description</label>
            <textarea name="description" rows={4} value={form.description} onChange={updateField} className="input" required placeholder="Detailed description..." />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Category</label>
              <select name="category" value={form.category} onChange={updateField} className="input">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Priority</label>
              <select name="priority" value={form.priority} onChange={updateField} className="input">
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Assign to</label>
            <select name="assignedTo" value={form.assignedTo} onChange={updateField} className="input">
              <option value="">Unassigned</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tags</label>
            <input name="tags" value={form.tags} onChange={updateField} className="input" placeholder="Comma-separated tags" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Customer email (optional)</label>
            <input name="customerEmail" type="email" value={form.customerEmail} onChange={updateField} className="input" placeholder="customer@example.com" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Ticket' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Detail Panel (slide-over) ───────────────────────────────────
function TicketDetailPanel({ ticket, onClose, onStatusChange, onAddComment, teamMembers, onEdit }) {
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!ticket) return null

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await onAddComment(ticket.id, { content: comment, isInternal })
      setComment('')
      setIsInternal(false)
    } finally {
      setSubmitting(false)
    }
  }

  const assignedMember = teamMembers.find((m) => m.id === ticket.assignedTo || m.id === ticket.assignedToId)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-brand-500">{formatTicketNumber(ticket.ticketNumber || ticket.id)}</p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">{ticket.subject}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onEdit(ticket)} className="btn-ghost h-8 px-2.5 text-xs">
              <Pencil className="h-3.5 w-3.5" />Edit
            </button>
            <button type="button" onClick={onClose} className="btn-ghost h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`badge text-xs ${STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN}`}>{ticket.status?.replace('_', ' ')}</span>
            <span className={`badge text-xs ${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.MEDIUM}`}>{ticket.priority}</span>
            <span className={`badge text-xs ${CATEGORY_COLORS[ticket.category] || CATEGORY_COLORS.OTHER}`}>{ticket.category?.replace('_', ' ')}</span>
          </div>

          {/* Description */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Description</p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Assigned to</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                {assignedMember?.name || ticket.assignedToName || 'Unassigned'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Created</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{formatDate(ticket.createdAt)}</p>
            </div>
            {ticket.customerEmail && (
              <div className="col-span-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/40">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Customer email</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{ticket.customerEmail}</p>
              </div>
            )}
            {ticket.tags && (
              <div className="col-span-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/40">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(Array.isArray(ticket.tags) ? ticket.tags : String(ticket.tags).split(',')).filter(Boolean).map((tag, i) => (
                    <span key={i} className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px]">
                      <Tag className="mr-0.5 h-2.5 w-2.5" />{tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <button type="button" onClick={() => onStatusChange(ticket.id, 'resolve')} className="btn-primary h-8 px-3 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />Resolve
              </button>
            )}
            {ticket.status !== 'CLOSED' && (
              <button type="button" onClick={() => onStatusChange(ticket.id, 'close')} className="btn-secondary h-8 px-3 text-xs">
                <XCircle className="h-3.5 w-3.5" />Close
              </button>
            )}
            {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
              <button type="button" onClick={() => onStatusChange(ticket.id, 'reopen')} className="btn-ghost h-8 px-3 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />Reopen
              </button>
            )}
          </div>

          {/* Comment thread */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              <MessageSquare className="mr-1 inline h-3.5 w-3.5" />Comments
            </p>
            <div className="space-y-3">
              {(ticket.comments || []).length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">No comments yet</p>
              )}
              {(ticket.comments || []).map((c, i) => (
                <div key={c.id || i} className={`rounded-xl border p-3 ${
                  c.isInternal
                    ? 'border-amber-200/70 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20'
                    : 'border-slate-200/70 bg-white/70 dark:border-slate-800/70 dark:bg-slate-950/40'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {c.authorName || c.author || 'Unknown'}
                      {c.isInternal && <span className="ml-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"><Lock className="mr-0.5 inline h-2.5 w-2.5" />Internal</span>}
                    </p>
                    <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add comment form */}
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="input"
              placeholder="Add a comment..."
              required
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <Lock className="h-3 w-3" />Internal note
              </label>
              <button type="submit" className="btn-primary h-8 px-3 text-xs" disabled={submitting || !comment.trim()}>
                <Send className="h-3.5 w-3.5" />{submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════
export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 })
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)

  // ── Data loading ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ticketRows, statsData, members] = await Promise.allSettled([
        ticketsAPI.getAll(),
        ticketsAPI.getStats(),
        teamAPI.getAll(),
      ])
      const tList = ticketRows.status === 'fulfilled' ? (Array.isArray(ticketRows.value) ? ticketRows.value : ticketRows.value?.content || []) : []
      setTickets(tList)
      if (statsData.status === 'fulfilled' && statsData.value) {
        setStats(statsData.value)
      } else {
        // Compute stats from tickets
        const open = tList.filter((t) => t.status === 'OPEN').length
        const inProg = tList.filter((t) => t.status === 'IN_PROGRESS').length
        const resolved = tList.filter((t) => t.status === 'RESOLVED').length
        setStats({ total: tList.length, open, inProgress: inProg, resolved })
      }
      if (members.status === 'fulfilled') {
        setTeamMembers(Array.isArray(members.value) ? members.value : members.value?.content || [])
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to load tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Filtered tickets ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = tickets
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          (t.subject || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.ticketNumber && formatTicketNumber(t.ticketNumber).toLowerCase().includes(q))
      )
    }
    if (statusFilter) list = list.filter((t) => t.status === statusFilter)
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter)
    if (categoryFilter) list = list.filter((t) => t.category === categoryFilter)
    return list
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter])

  // ── Handlers ────────────────────────────────────────────────
  const openCreateModal = () => {
    setForm(EMPTY_FORM)
    setIsEdit(false)
    setModalOpen(true)
  }

  const openEditModal = (ticket) => {
    setForm({
      id: ticket.id,
      subject: ticket.subject || '',
      description: ticket.description || '',
      category: ticket.category || 'SUPPORT',
      priority: ticket.priority || 'MEDIUM',
      assignedTo: ticket.assignedTo || ticket.assignedToId || '',
      tags: Array.isArray(ticket.tags) ? ticket.tags.join(', ') : (ticket.tags || ''),
      customerEmail: ticket.customerEmail || '',
    })
    setIsEdit(true)
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        subject: form.subject,
        description: form.description,
        category: form.category,
        priority: form.priority,
        assignedTo: form.assignedTo || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        customerEmail: form.customerEmail || null,
      }
      if (isEdit && form.id) {
        await ticketsAPI.update(form.id, payload)
        toast.success('Ticket updated')
      } else {
        await ticketsAPI.create(payload)
        toast.success('Ticket created')
      }
      setModalOpen(false)
      setForm(EMPTY_FORM)
      await loadData()
      // Refresh selected ticket if it was edited
      if (isEdit && selectedTicket?.id === form.id) {
        try {
          const updated = await ticketsAPI.getById(form.id)
          setSelectedTicket(updated)
        } catch {}
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to save ticket')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id, action) => {
    try {
      if (action === 'resolve') await ticketsAPI.resolve(id)
      else if (action === 'close') await ticketsAPI.close(id)
      else if (action === 'reopen') await ticketsAPI.reopen(id)
      toast.success(`Ticket ${action === 'resolve' ? 'resolved' : action === 'close' ? 'closed' : 'reopened'}`)
      await loadData()
      // Refresh detail panel
      try {
        const updated = await ticketsAPI.getById(id)
        setSelectedTicket(updated)
      } catch {}
    } catch (err) {
      toast.error(err?.message || `Unable to ${action} ticket`)
    }
  }

  const handleAddComment = async (id, data) => {
    try {
      await ticketsAPI.addComment(id, data)
      toast.success('Comment added')
      // Refresh ticket details
      const updated = await ticketsAPI.getById(id)
      setSelectedTicket(updated)
    } catch (err) {
      toast.error(err?.message || 'Unable to add comment')
    }
  }

  const selectTicket = async (ticket) => {
    try {
      const full = await ticketsAPI.getById(ticket.id)
      setSelectedTicket(full)
    } catch {
      setSelectedTicket(ticket)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeading
          title="Tickets"
          subtitle="Manage support tickets, track issues, and resolve customer requests."
          icon={<LifeBuoy className="h-5 w-5" />}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadData} disabled={loading} className="btn-secondary">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          <button type="button" onClick={openCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />New Ticket
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Tickets" value={stats.total ?? 0} icon={LifeBuoy} color="text-brand-500" />
        <KpiCard label="Open" value={stats.open ?? 0} icon={AlertTriangle} color="text-brand-500" sub="Awaiting action" />
        <KpiCard label="In Progress" value={stats.inProgress ?? 0} icon={Clock} color="text-amber-500" sub="Being worked on" />
        <KpiCard label="Resolved" value={stats.resolved ?? 0} icon={CheckCircle2} color="text-emerald-500" sub="Successfully resolved" />
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto min-w-[130px]">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input w-auto min-w-[130px]">
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input w-auto min-w-[140px]">
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Ticket cards */}
      {loading ? (
        <Skeleton count={5} h="h-28" />
      ) : filtered.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <LifeBuoy className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">No tickets found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => selectTicket(ticket)}
              className="glass-card cursor-pointer p-4 transition hover:border-brand-300 dark:hover:border-brand-900/50"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-brand-500">{formatTicketNumber(ticket.ticketNumber || ticket.id)}</span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</h3>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`badge text-[10px] ${CATEGORY_COLORS[ticket.category] || CATEGORY_COLORS.OTHER}`}>{ticket.category?.replace('_', ' ')}</span>
                    <span className={`badge text-[10px] ${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.MEDIUM}`}>{ticket.priority}</span>
                    <span className={`badge text-[10px] ${STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN}`}>{ticket.status?.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{truncate(ticket.description)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {(ticket.assignedToName || ticket.assignedTo) && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />{ticket.assignedToName || teamMembers.find((m) => m.id === ticket.assignedTo)?.name || 'Assigned'}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{formatDate(ticket.createdAt)}
                    </span>
                    {ticket.comments?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />{ticket.comments.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {filtered.length} ticket{filtered.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <TicketModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            saving={saving}
            teamMembers={teamMembers}
            isEdit={isEdit}
          />
        )}
      </AnimatePresence>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedTicket && (
          <TicketDetailPanel
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onStatusChange={handleStatusChange}
            onAddComment={handleAddComment}
            teamMembers={teamMembers}
            onEdit={(t) => { setSelectedTicket(null); openEditModal(t) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
