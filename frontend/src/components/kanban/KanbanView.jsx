import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  DndContext, DragOverlay, pointerWithin, rectIntersection,
  useDroppable,
  KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Filter, Search, IndianRupee, Calendar,
  User, Flame, Thermometer, Snowflake, MoreHorizontal, Trash2, X,
  ChevronLeft, ChevronRight, RefreshCw,
  Phone, AtSign, Building2, Tag, PhoneCall, MessageCircle, Edit
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLeadsStore } from '../../store/leadsStore'
import { useAuthStore } from '../../store/authStore'
import { getLeadAgingMeta } from '../../utils/leadSla'
import { leadsAPI, teamAPI } from '../../services/api'
import PageHeading from '../ui/PageHeading'
import { PERMISSIONS, hasPermission } from '../../utils/permissions'

/* ── Pipeline stages — matches lead statuses ───────────────── */
const STAGES = [
  { key: 'new',         label: 'New',         color: 'bg-slate-400' },
  { key: 'contacted',   label: 'Contacted',   color: 'bg-sky-400' },
  { key: 'qualified',   label: 'Qualified',   color: 'bg-brand-400' },
  { key: 'proposal',    label: 'Proposal',    color: 'bg-amber-400' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-400' },
  { key: 'won',         label: 'Won',         color: 'bg-emerald-400' },
  { key: 'lost',        label: 'Lost',        color: 'bg-red-400' },
]

const SCORE_CONFIG = {
  hot:  { icon: Flame,        color: 'text-red-500',   label: 'Hot',  cls: 'badge-hot' },
  warm: { icon: Thermometer,  color: 'text-amber-500', label: 'Warm', cls: 'badge-warm' },
  cold: { icon: Snowflake,    color: 'text-sky-500',   label: 'Cold', cls: 'badge-cold' },
}

const LEAD_SOURCES = [
  'Facebook', 'Instagram', 'LinkedIn', 'Website', 'WhatsApp',
  'Google Ads', 'Meta Ads', 'Referral', 'Email', 'Other',
]

const STAGE_DROP_PREFIX = 'stage:'

/* Custom collision detection: prefer stage column droppables (pointerWithin)
   so empty columns work, then fall back to rectIntersection for card-level drops */
function kanbanCollision(args) {
  // First check if pointer is within any droppable (works for empty columns)
  const pointerHits = pointerWithin(args)
  // Prefer stage-level droppables (stage:xxx) over card-level sortables
  const stageHit = pointerHits.find((h) => String(h.id).startsWith(STAGE_DROP_PREFIX))
  if (stageHit) return [stageHit]
  // If pointer is over a card, use that
  if (pointerHits.length > 0) return pointerHits
  // Fallback: rectIntersection for edge cases
  return rectIntersection(args)
}

/* ── Lead card (shown in Kanban column) ────────────────────── */
function LeadCard({
  lead,
  stage,
  isDragging,
  isMenuOpen,
  onToggleMenu,
  onMoveLead,
  onDeleteLead,
  agingMeta,
  canMoveLead,
  canDeleteLead,
  onCall,
  onWhatsApp,
  callingLeadId,
}) {
  const scoreCfg = SCORE_CONFIG[lead.score] || SCORE_CONFIG.warm
  const ScoreIcon = scoreCfg.icon

  return (
    <div className={`deal-card select-none relative ${isDragging ? 'opacity-50 rotate-2 shadow-2xl' : ''}`}>
      {/* Name + menu */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight line-clamp-1">
            {lead.name}
          </p>
          {lead.company && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{lead.company}</p>
          )}
        </div>
        {(canMoveLead || canDeleteLead) && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleMenu(lead.id) }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
            data-lead-menu
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-8 z-40 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
            data-lead-menu
          >
            {canMoveLead && STAGES.filter((s) => s.key !== stage).map((s) => (
              <button
                key={s.key}
                onClick={() => onMoveLead(lead.id, s.key)}
                className="w-full px-3 py-2 text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Move to {s.label}
              </button>
            ))}
            {canMoveLead && canDeleteLead && <div className="h-px bg-slate-200 dark:bg-slate-700" />}
            {canDeleteLead && (
              <button
                onClick={() => onDeleteLead(lead.id)}
                className="w-full px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Lead
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score badge + aging */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={`${scoreCfg.cls} text-[10px]`}>
          <ScoreIcon className="w-3 h-3" /> {scoreCfg.label}
        </span>
        {agingMeta && (
          <span className={`badge ${agingMeta.badge} text-[10px]`}>{agingMeta.label}</span>
        )}
      </div>

      {/* Value + source */}
      <div className="flex items-center justify-between text-xs mb-2">
        {lead.value > 0 ? (
          <span className="flex items-center gap-0.5 font-bold text-slate-700 dark:text-slate-300">
            <IndianRupee className="w-3 h-3" />
            {(lead.value / 1000).toFixed(0)}k
          </span>
        ) : (
          <span className="text-slate-400 text-[11px]">No value</span>
        )}
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{lead.source}</span>
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-2">
        {lead.email && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
            <AtSign className="w-3 h-3 flex-shrink-0" /> {lead.email}
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
            <Phone className="w-3 h-3 flex-shrink-0" /> {lead.phone}
          </div>
        )}
      </div>

      {/* Owner + date */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <User className="w-3 h-3" /> {lead.assignedTo || 'Unassigned'}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Calendar className="w-3 h-3" /> {lead.createdAt}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
        {lead.phone && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onCall?.(lead) }}
            disabled={callingLeadId === lead.id}
            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
            title={callingLeadId === lead.id ? 'Calling…' : 'Call'}
          >
            <PhoneCall className={`w-3.5 h-3.5 ${callingLeadId === lead.id ? 'animate-pulse' : ''}`} />
          </button>
        )}
        {lead.phone && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onWhatsApp?.(lead) }}
            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-slate-400 hover:text-green-600 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        )}
        {lead.service && (
          <span className="ml-auto text-[10px] text-slate-400 truncate max-w-[80px]" title={lead.service}>
            <Tag className="w-3 h-3 inline mr-0.5" />{lead.service}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Sortable wrapper for lead cards ───────────────────────── */
function SortableLeadCard({
  lead, stage, isMenuOpen, onToggleMenu, onMoveLead, onDeleteLead,
  agingMeta, canMoveLead, canDeleteLead, onCall, onWhatsApp, callingLeadId,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(lead.id),
    disabled: !canMoveLead,
    data: { stage },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isMenuOpen ? 'relative z-30' : 'relative'}
      {...attributes}
      {...listeners}
    >
      <LeadCard
        lead={lead}
        stage={stage}
        isDragging={isDragging}
        isMenuOpen={isMenuOpen}
        onToggleMenu={onToggleMenu}
        onMoveLead={onMoveLead}
        onDeleteLead={onDeleteLead}
        agingMeta={agingMeta}
        canMoveLead={canMoveLead}
        canDeleteLead={canDeleteLead}
        onCall={onCall}
        onWhatsApp={onWhatsApp}
        callingLeadId={callingLeadId}
      />
    </div>
  )
}

/* ── Kanban column ─────────────────────────────────────────── */
function KanbanColumn({
  stage, leads: columnLeads, onAddLead, openMenuId, onToggleMenu,
  onMoveLead, onDeleteLead, canCreateLead, canMoveLead, canDeleteLead,
  onCall, onWhatsApp, callingLeadId,
}) {
  const totalValue = columnLeads.reduce((s, l) => s + (l.value || 0), 0)
  const dropId = `${STAGE_DROP_PREFIX}${stage.key}`
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { stage: stage.key, type: 'stage' },
  })

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column transition-colors ${isOver ? 'ring-2 ring-brand-300 dark:ring-brand-500/60' : ''}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{stage.label}</span>
          <span className="badge bg-white/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
            {columnLeads.length}
          </span>
        </div>
        {canCreateLead && (
          <button
            onClick={() => onAddLead(stage.key)}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Column value */}
      {totalValue > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400 px-1 mb-2">
          ₹{(totalValue / 100000).toFixed(1)}L total
        </div>
      )}

      {/* Lead cards */}
      <SortableContext id={stage.key} items={columnLeads.map((l) => String(l.id))} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {columnLeads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              stage={stage.key}
              isMenuOpen={openMenuId === lead.id}
              onToggleMenu={onToggleMenu}
              onMoveLead={onMoveLead}
              onDeleteLead={onDeleteLead}
              agingMeta={getLeadAgingMeta(lead)}
              canMoveLead={canMoveLead}
              canDeleteLead={canDeleteLead}
              onCall={onCall}
              onWhatsApp={onWhatsApp}
              callingLeadId={callingLeadId}
            />
          ))}
        </div>
      </SortableContext>

      {columnLeads.length === 0 && (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <p className="text-xs text-slate-400 text-center py-8">Drop leads here</p>
        </div>
      )}
    </div>
  )
}

/* ── Add Lead Modal (compact, for pipeline) ────────────────── */
function AddLeadModal({ onClose, onAdd, teamMembers, initialStage }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', service: '', specialization: '',
    source: 'Website', score: 'warm', status: initialStage || 'new',
    assignedToId: '', value: '', tags: '', expectedCloseTimeline: ''
  })
  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'expectedCloseTimeline' && value) {
      const scoreMap = { DAYS_1_3: 'hot', DAYS_7_10: 'warm', DAYS_10_15_PLUS: 'cold' }
      setForm((prev) => ({ ...prev, [name]: value, score: scoreMap[value] || prev.score }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({
      ...form,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      createdAtTs: new Date().toISOString(),
      followUpSlaMinutes: 60,
      value: Number(form.value) || 0,
    })
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Add lead"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Lead</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Full Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required className="input" placeholder="Ramesh Patel" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Company</label>
            <input name="company" value={form.company} onChange={handleChange} className="input" placeholder="Tech Corp" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required className="input" placeholder="ramesh@techcorp.in" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+91-98765-43210" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Service</label>
            <input name="service" value={form.service} onChange={handleChange} className="input" placeholder="CRM Setup" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Deal Value (₹)</label>
            <input name="value" type="number" value={form.value} onChange={handleChange} className="input" placeholder="100000" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Source</label>
            <select name="source" value={form.source} onChange={handleChange} className="input">
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">AI Score</label>
            <select name="score" value={form.score} onChange={handleChange} className="input">
              <option value="hot">🔥 Hot</option>
              <option value="warm">🌡️ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="input">
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Expected Close</label>
            <select name="expectedCloseTimeline" value={form.expectedCloseTimeline} onChange={handleChange} className="input">
              <option value="">Select timeline</option>
              <option value="DAYS_1_3">1-3 Days (Hot)</option>
              <option value="DAYS_7_10">7-10 Days (Warm)</option>
              <option value="DAYS_10_15_PLUS">10-15+ Days (Cold)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Assigned To</label>
          <select name="assignedToId" value={form.assignedToId} onChange={handleChange} className="input">
            <option value="">Unassigned</option>
            {(teamMembers || []).map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          <button type="submit" className="btn-primary text-xs">Create Lead</button>
        </div>
      </motion.form>
    </motion.div>
  )
}

/* ── Main Pipeline Page ────────────────────────────────────── */
export default function KanbanPage() {
  const { user } = useAuthStore()
  const {
    leads,
    fetchLeads,
    createLead,
    deleteLead,
    patchLeadLocal,
  } = useLeadsStore()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addStage, setAddStage] = useState('new')
  const [filterScore, setFilterScore] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [filterOwner, setFilterOwner] = useState('all')
  const [teamMembers, setTeamMembers] = useState([])
  const [callingLeadId, setCallingLeadId] = useState(null)

  const canCreateLead = hasPermission(user, PERMISSIONS.LEADS_CREATE)
  const canUpdateLead = hasPermission(user, PERMISSIONS.LEADS_UPDATE)
  const canDeleteLead = hasPermission(user, PERMISSIONS.LEADS_DELETE)
  const canCall = hasPermission(user, PERMISSIONS.COMMUNICATIONS_SEND)
  const canViewTeam = hasPermission(user, PERMISSIONS.TEAM_VIEW)

  const filterRef = useRef(null)
  const boardScrollRef = useRef(null)
  const routeSearch = searchParams.get('search') ?? ''

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { setSearch(routeSearch) }, [routeSearch])

  /* Load all leads */
  const loadLeads = useCallback(async () => {
    try {
      await fetchLeads({})
    } catch (err) {
      toast.error(err?.message || 'Failed to load leads')
    }
  }, [fetchLeads])

  useEffect(() => {
    setLoading(true)
    loadLeads().finally(() => setLoading(false))
  }, [loadLeads])

  /* Load team members */
  useEffect(() => {
    if (!canViewTeam) { setTeamMembers([]); return }
    teamAPI.getAll()
      .then((rows) => {
        setTeamMembers((rows || [])
          .filter((r) => r && r.id && r.name && r.isActive !== false)
          .map((r) => ({ id: r.id, name: r.name })))
      })
      .catch(() => setTeamMembers([]))
  }, [canViewTeam])

  /* Close menus on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false)
      if (!e.target.closest('[data-lead-menu]')) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Unique owners for filter */
  const owners = useMemo(() => {
    const all = leads.map((l) => l.assignedTo).filter(Boolean)
    return [...new Set(all)]
  }, [leads])

  /* Group leads by status into pipeline columns */
  const leadsByStage = useMemo(() => {
    const q = search.toLowerCase()
    const map = {}
    for (const stage of STAGES) map[stage.key] = []

    for (const lead of leads) {
      const stageKey = lead.status || 'new'
      if (!map[stageKey]) continue // skip unknown statuses

      // Apply filters
      const matchesSearch = !search || lead.name?.toLowerCase().includes(q) || lead.company?.toLowerCase().includes(q) || lead.email?.toLowerCase().includes(q)
      const matchesScore = filterScore === 'all' || lead.score === filterScore
      const matchesSource = filterSource === 'all' || lead.source === filterSource
      const matchesOwner = filterOwner === 'all' || lead.assignedTo === filterOwner
      if (matchesSearch && matchesScore && matchesSource && matchesOwner) {
        map[stageKey].push(lead)
      }
    }
    return map
  }, [leads, search, filterScore, filterSource, filterOwner])

  const totalLeads = Object.values(leadsByStage).reduce((s, arr) => s + arr.length, 0)
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0)

  /* Find a lead and its stage */
  const findLeadAndStage = useCallback((id) => {
    for (const stage of Object.keys(leadsByStage)) {
      const lead = leadsByStage[stage].find((l) => String(l.id) === String(id))
      if (lead) return { lead, stage }
    }
    return null
  }, [leadsByStage])

  /* ── Move lead status (shared by drag-drop and context menu) ── */
  const moveLeadStatus = useCallback(async (leadId, targetStage) => {
    if (!canUpdateLead) { toast.error('No permission to move leads.'); return }

    const source = findLeadAndStage(leadId)
    if (!source || source.stage === targetStage) return

    const stageLabel = STAGES.find((s) => s.key === targetStage)?.label || targetStage

    // Optimistic update — only patch local state, don't use store's updateLead
    // (which sets loading:true and replaces the whole leads array, breaking DnD)
    patchLeadLocal(source.lead.id, { status: targetStage })

    try {
      // Build the backend payload from the lead's current data + new status
      const payload = {
        name: source.lead.name || '',
        email: source.lead.email || '',
        phone: source.lead.phone || '',
        company: source.lead.company || '',
        service: source.lead.service || '',
        specialization: source.lead.specialization || '',
        source: String(source.lead.source || 'OTHER').toUpperCase().replace(/\s+/g, '_'),
        score: String(source.lead.score || 'cold').toUpperCase(),
        status: targetStage.toUpperCase(),
        dealValue: Number(source.lead.value || 0),
        assignedToId: source.lead.assignedToId || null,
        tags: String(source.lead.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        expectedCloseTimeline: source.lead.expectedCloseTimeline || null,
      }
      await leadsAPI.update(source.lead.id, payload)
      toast.success(`${source.lead.name} → ${stageLabel}`)
    } catch (err) {
      // Revert on failure
      patchLeadLocal(source.lead.id, { status: source.stage })
      toast.error(err?.message || 'Failed to move lead')
    }
  }, [canUpdateLead, findLeadAndStage, patchLeadLocal])

  /* ── Drag & drop handlers ────────────────────────────────── */
  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!canUpdateLead || !over || active.id === over.id) return

    const source = findLeadAndStage(active.id)
    if (!source) return

    const overId = over?.id
    const stageFromDropId =
      typeof overId === 'string' && overId.startsWith(STAGE_DROP_PREFIX)
        ? overId.slice(STAGE_DROP_PREFIX.length)
        : null
    const stageFromItem = over?.data?.current?.stage
    const stageFromSortable = over?.data?.current?.sortable?.containerId
    const targetStage = (
      stageFromDropId ||
      stageFromItem ||
      (typeof stageFromSortable === 'string' && leadsByStage[stageFromSortable] ? stageFromSortable : null) ||
      Object.keys(leadsByStage).find((s) => leadsByStage[s].some((l) => String(l.id) === String(overId)))
    )
    if (!targetStage || targetStage === source.stage) return

    moveLeadStatus(source.lead.id, targetStage)
  }

  const activeLead = activeId ? findLeadAndStage(activeId)?.lead : null

  /* ── Move via context menu ───────────────────────────────── */
  const moveLead = async (leadId, targetStage) => {
    setOpenMenuId(null)
    moveLeadStatus(leadId, targetStage)
  }

  /* ── Delete ──────────────────────────────────────────────── */
  const handleDeleteLead = async (leadId) => {
    if (!canDeleteLead) { toast.error('No permission to delete leads.'); return }
    try {
      await deleteLead(leadId)
      setOpenMenuId(null)
      toast.success('Lead deleted')
    } catch (err) {
      toast.error(err?.message || 'Failed to delete lead')
    }
  }

  /* ── Add lead ────────────────────────────────────────────── */
  const openAddModal = (stage = 'new') => {
    if (!canCreateLead) { toast.error('No permission to create leads.'); return }
    setAddStage(stage)
    setShowAddModal(true)
  }

  const handleAddLead = async (leadData) => {
    if (!canCreateLead) { toast.error('No permission to create leads.'); return }
    try {
      await createLead(leadData)
      toast.success('Lead added to pipeline!')
    } catch (err) {
      toast.error(err?.message || 'Failed to add lead')
    }
  }

  /* ── Call ─────────────────────────────────────────────────── */
  const handleCallLead = async (lead) => {
    if (!canCall || !lead?.phone) return
    try {
      setCallingLeadId(lead.id)
      await leadsAPI.callNow(lead.id, {})
      toast.success('Call queued')
    } catch (err) {
      toast.error(err?.message || 'Failed to place call')
    } finally {
      setCallingLeadId((prev) => (prev === lead.id ? null : prev))
    }
  }

  const handleWhatsApp = (lead) => {
    if (!lead?.phone) { toast.error('No phone number'); return }
    const phone = lead.phone.replace(/[^0-9+]/g, '')
    window.open(`https://wa.me/${phone.replace('+', '')}`, '_blank')
  }

  /* ── Board scroll ────────────────────────────────────────── */
  const scrollBoard = (dir) => {
    boardScrollRef.current?.scrollBy({ left: dir === 'left' ? -420 : 420, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4" onClick={() => setOpenMenuId(null)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          title="Leads Pipeline"
          subtitle={loading
            ? 'Loading leads...'
            : `${totalLeads} leads · ₹${(totalValue / 100000).toFixed(1)}L pipeline value`}
        />
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => { setLoading(true); loadLeads().finally(() => setLoading(false)) }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
            title="Refresh pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none w-full sm:w-40"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilters((p) => !p) }}
              className="btn-secondary gap-1.5 text-xs"
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ duration: 0.12 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-10 z-30 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 space-y-2"
                >
                  <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)} className="input text-xs py-2">
                    <option value="all">All scores</option>
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🌡️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                  <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="input text-xs py-2">
                    <option value="all">All sources</option>
                    {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="input text-xs py-2">
                    <option value="all">All owners</option>
                    {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button
                    onClick={() => { setFilterScore('all'); setFilterSource('all'); setFilterOwner('all') }}
                    className="w-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1"
                  >
                    Clear Filters
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {canCreateLead && (
            <button onClick={() => openAddModal('new')} className="btn-primary gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="mb-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollBoard('left')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Scroll board left"
          >
            <ChevronLeft className="w-4 h-4" /> Left
          </button>
          <button
            type="button"
            onClick={() => scrollBoard('right')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Scroll board right"
          >
            Right <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div ref={boardScrollRef} className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar scroll-smooth">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              leads={leadsByStage[stage.key] || []}
              onAddLead={openAddModal}
              openMenuId={openMenuId}
              onToggleMenu={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
              onMoveLead={canUpdateLead ? moveLead : () => {}}
              onDeleteLead={canDeleteLead ? handleDeleteLead : () => {}}
              canCreateLead={canCreateLead}
              canMoveLead={canUpdateLead}
              canDeleteLead={canDeleteLead}
              onCall={canCall ? handleCallLead : null}
              onWhatsApp={handleWhatsApp}
              callingLeadId={callingLeadId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <LeadCard
              lead={activeLead}
              stage={findLeadAndStage(activeId)?.stage ?? 'new'}
              isDragging={false}
              isMenuOpen={false}
              onToggleMenu={() => {}}
              onMoveLead={() => {}}
              onDeleteLead={() => {}}
              agingMeta={getLeadAgingMeta(activeLead)}
              canMoveLead={false}
              canDeleteLead={false}
              onCall={() => {}}
              onWhatsApp={() => {}}
              callingLeadId={null}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddLeadModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddLead}
            teamMembers={teamMembers}
            initialStage={addStage}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
