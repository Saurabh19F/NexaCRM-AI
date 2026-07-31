import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ClipboardList,
  RefreshCw,
  Search,
  User,
  Phone,
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Building2,
  CalendarDays,
  AlertTriangle,
  Filter,
  Eye,
  IndianRupee,
  Tag,
  ArrowUpRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeading from '../components/ui/PageHeading'
import LeadActivitiesModal from '../components/LeadActivitiesModal'
import { leadsAPI } from '../services/api'

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  return []
}

const TABS = [
  { key: 'pending', label: 'Follow-up Pending' },
  { key: 'completed', label: 'Completed Leads' },
]

const ACTIVITY_DEFS = [
  { idx: 0, id: 'act01', label: 'Activity 01', title: 'Welcome Call', icon: Phone, color: 'red' },
  { idx: 1, id: 'act02', label: 'Activity 02', title: 'Follow Up for Meeting', icon: Clock, color: 'blue' },
  { idx: 2, id: 'act03', label: 'Activity 03', title: 'Meeting', icon: Users, color: 'sky' },
  { idx: 3, id: 'act04', label: 'Activity 04', title: 'Meeting Outcome', icon: Trophy, color: 'green' },
]

const COLOR_MAP = {
  red: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ring: 'ring-red-400/40',
  },
  blue: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ring: 'ring-blue-400/40',
  },
  sky: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    ring: 'ring-sky-400/40',
  },
  green: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    ring: 'ring-emerald-400/40',
  },
}

const normalizeOutcome = (v) => String(v || '').trim().toLowerCase()

function parseLeadActivities(activities) {
  const stages = [null, null, null, null]
  const stageValues = [{}, {}, {}, {}]

  for (const act of activities) {
    const label = (act.activityLabel || act.activityTitle || '').toLowerCase()
    const summary = (act.summary || '').toLowerCase()
    let idx = -1
    if (label.includes('01') || label.includes('welcome call') || label.includes('call outcome')) idx = 0
    else if (label.includes('02') || label.includes('follow up for meeting')) idx = 1
    else if (label.includes('03') || label.includes('allowed person')) idx = 2
    else if (label.includes('04') || label.includes('meeting outcome')) idx = 3

    if (idx >= 0) {
      const ts = new Date(act.savedAt || act.createdAt || 0).getTime()
      const prev = stages[idx]
      if (!prev || ts > new Date(prev.savedAt || prev.createdAt || 0).getTime()) {
        stages[idx] = act
        stageValues[idx] = act.values || {}
      }
    }
  }

  let currentStage = -1
  for (let i = 3; i >= 0; i--) {
    if (stages[i]) { currentStage = i; break }
  }

  let isCompleted = false
  let outcome = null
  let completedAt = null
  let finalPrice = null
  let lostCategory = null

  if (stages[3]) {
    const v = stageValues[3]
    const status = normalizeOutcome(v.status)
    if (status === 'won' || status === 'win' || status === 'closed won') {
      isCompleted = true
      outcome = 'Won'
      completedAt = stages[3].savedAt || stages[3].createdAt
      finalPrice = v.meetingPriceFinal || null
    } else if (status === 'lost' || status === 'close lost' || status === 'closed lost') {
      isCompleted = true
      outcome = 'Lost'
      completedAt = stages[3].savedAt || stages[3].createdAt
      lostCategory = v.lostCategory || null
    }
  }

  const stageStatuses = stages.map((s, i) => {
    if (!s) return 'not_started'
    const v = stageValues[i]
    const status = normalizeOutcome(v.status || v.connectionStatus || v.callOutcome || '')
    if (i === 0) {
      if (status === 'connected') return 'connected'
      if (status === 'non connected') return 'non_connected'
      return 'done'
    }
    if (i === 1) {
      if (status === 'meeting') return 'meeting'
      if (status === 'follow up' || status === 'follow-up' || status === 'followup') return 'follow_up'
      if (status === 'not interested' || status === 'not_interested') return 'not_interested'
      return 'done'
    }
    if (i === 2) {
      if (status === 'successful' || status === 'success') return 'successful'
      if (status === 'failed' || status === 'failure') return 'failed'
      return 'done'
    }
    if (i === 3) {
      if (status === 'won' || status === 'win' || status === 'closed won') return 'won'
      if (status === 'lost' || status === 'close lost' || status === 'closed lost') return 'lost'
      if (status === 'negotiation') return 'negotiation'
      if (status === 'hold' || status === 'follow up' || status === 'follow-up') return 'hold'
      if (status === 'pending') return 'pending'
      return 'done'
    }
    return 'done'
  })

  return { stages, stageValues, stageStatuses, currentStage, isCompleted, outcome, completedAt, finalPrice, lostCategory }
}

function getStatusLabel(stageIdx, status) {
  if (status === 'not_started') return 'Not Started'
  if (stageIdx === 0) {
    if (status === 'connected') return 'Connected'
    if (status === 'non_connected') return 'Non Connected'
  }
  if (stageIdx === 1) {
    if (status === 'meeting') return 'Meeting'
    if (status === 'follow_up') return 'Follow Up'
    if (status === 'not_interested') return 'Not Interested'
  }
  if (stageIdx === 2) {
    if (status === 'successful') return 'Successful'
    if (status === 'failed') return 'Failed'
  }
  if (stageIdx === 3) {
    if (status === 'won') return 'Won'
    if (status === 'lost') return 'Lost'
    if (status === 'negotiation') return 'Negotiation'
    if (status === 'hold') return 'Hold'
    if (status === 'pending') return 'Pending'
  }
  return 'Done'
}

function getStatusColor(status) {
  if (status === 'not_started') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  if (status === 'connected' || status === 'meeting' || status === 'successful' || status === 'won')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (status === 'non_connected' || status === 'not_interested' || status === 'failed' || status === 'lost')
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  if (status === 'follow_up' || status === 'hold' || status === 'negotiation' || status === 'pending')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ActivityStepper({ stageStatuses, currentStage }) {
  return (
    <div className="flex items-center gap-0.5">
      {ACTIVITY_DEFS.map((def, i) => {
        const status = stageStatuses[i]
        const isCurrent = i === currentStage
        const isDone = status !== 'not_started'
        const Icon = def.icon
        const colors = COLOR_MAP[def.color]
        return (
          <div key={def.id} className="flex items-center">
            <div className="group relative flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  isDone
                    ? isCurrent
                      ? `${colors.dot} text-white ring-2 ${colors.ring} shadow-sm`
                      : `${colors.dot}/80 text-white`
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="pointer-events-none absolute -bottom-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-lg group-hover:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="font-semibold">{def.title}</span>
                <br />
                <span className={getStatusColor(status) + ' mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px]'}>
                  {getStatusLabel(i, status)}
                </span>
              </div>
            </div>
            {i < 3 && (
              <div className={`mx-0.5 h-0.5 w-4 rounded-full transition-all ${
                stageStatuses[i + 1] !== 'not_started'
                  ? 'bg-emerald-400 dark:bg-emerald-500'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function TaskFollowUpPage() {
  const [leads, setLeads] = useState([])
  const [leadActivities, setLeadActivities] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [activitiesLead, setActivitiesLead] = useState(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const response = await leadsAPI.getAll({ page: 0, size: 500, sort: 'createdAt,desc' })
      const rows = unwrapList(response)
      setLeads(rows)
      return rows
    } catch (err) {
      toast.error(err?.message || 'Unable to load leads')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAllActivities = useCallback(async (leadRows) => {
    if (!leadRows.length) return
    setLoadingActivities(true)
    try {
      const results = {}
      const batchSize = 10
      for (let i = 0; i < leadRows.length; i += batchSize) {
        const batch = leadRows.slice(i, i + batchSize)
        const responses = await Promise.allSettled(
          batch.map((lead) => leadsAPI.getActivities(lead.id))
        )
        responses.forEach((res, j) => {
          const leadId = batch[j].id
          results[leadId] = res.status === 'fulfilled' ? unwrapList(res.value) : []
        })
      }
      setLeadActivities(results)
    } catch (err) {
      toast.error('Unable to load some activity data')
    } finally {
      setLoadingActivities(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    const rows = await loadLeads()
    await loadAllActivities(rows)
  }, [loadLeads, loadAllActivities])

  useEffect(() => {
    refresh()
  }, [])

  const enrichedLeads = useMemo(() => {
    return leads.map((lead) => {
      const activities = leadActivities[lead.id] || []
      const parsed = parseLeadActivities(activities)
      return { ...lead, ...parsed, activityCount: activities.length }
    })
  }, [leads, leadActivities])

  const pendingLeads = useMemo(() => {
    let filtered = enrichedLeads.filter((l) => !l.isCompleted)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(q) ||
          (l.company || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q)
      )
    }
    if (stageFilter) {
      const idx = Number(stageFilter)
      filtered = filtered.filter((l) => l.currentStage === idx)
    }
    return filtered
  }, [enrichedLeads, searchQuery, stageFilter])

  const completedLeads = useMemo(() => {
    let filtered = enrichedLeads.filter((l) => l.isCompleted)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(q) ||
          (l.company || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q)
      )
    }
    return filtered
  }, [enrichedLeads, searchQuery])

  const stats = useMemo(() => {
    const pending = enrichedLeads.filter((l) => !l.isCompleted)
    const completed = enrichedLeads.filter((l) => l.isCompleted)
    const won = completed.filter((l) => l.outcome === 'Won')
    const lost = completed.filter((l) => l.outcome === 'Lost')
    const totalRevenue = won.reduce((sum, l) => sum + Number(l.finalPrice || 0), 0)
    const stageCount = [0, 0, 0, 0]
    const notStarted = pending.filter((l) => l.currentStage === -1).length
    pending.forEach((l) => {
      if (l.currentStage >= 0) stageCount[l.currentStage]++
    })
    return { pending: pending.length, completed: completed.length, won: won.length, lost: lost.length, totalRevenue, stageCount, notStarted }
  }, [enrichedLeads])

  const handlePersistActivity = async ({ lead, activityIndex, activity, values }) => {
    const normalizedStatus = normalizeOutcome(values?.callOutcome || values?.connectionStatus || values?.status)
    const summary = activityIndex === 0
      ? [
          normalizedStatus ? `Status: ${normalizedStatus}` : null,
          lead?.source ? `Source: ${lead.source}` : null,
          lead?.service ? `Service: ${lead.service}` : lead?.specialization ? `Service: ${lead.specialization}` : null,
          lead?.createdAt ? `Planned: ${lead.createdAt}` : null,
          `Actual: ${new Date().toISOString()}`,
          values?.nextFollowUpDate || values?.followUpDate ? `Next follow-up: ${values.nextFollowUpDate || values.followUpDate}` : null,
          values?.remark || values?.remarks || values?.note ? `Remarks: ${values.remark || values.remarks || values.note}` : null,
        ].filter(Boolean).join(' | ') || 'Lead activity recorded'
      : Object.entries(values || {})
          .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ') || 'No extra details'

    const payload = {
      activityIndex,
      activityId: activity?.id || null,
      activityLabel: activity?.label || `Activity ${Number(activityIndex) + 1}`,
      activityTitle: activity?.title || '',
      assignedTo: values?.assignedTo || lead?.assignedToName || lead?.assignedTo?.name || lead?.assignedTo || 'Unassigned',
      values: values || {},
      summary,
    }
    await leadsAPI.addActivity(lead.id, payload)
  }

  const closeActivitiesModal = async () => {
    const leadId = activitiesLead?.id
    setActivitiesLead(null)
    if (leadId) {
      try {
        const acts = await leadsAPI.getActivities(leadId)
        setLeadActivities((prev) => ({ ...prev, [leadId]: unwrapList(acts) }))
      } catch {}
    }
  }

  const displayLeads = activeTab === 'pending' ? pendingLeads : completedLeads

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeading
          title="Task Follow-up"
          subtitle="Track every lead through activities and monitor follow-up progress."
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refresh} disabled={loading || loadingActivities} className="btn-secondary">
            <RefreshCw className={`h-4 w-4 ${loading || loadingActivities ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Pending Follow-ups</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.pending}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Leads in progress</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">By Activity</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ACTIVITY_DEFS.map((def, i) => (
                  <span key={def.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_MAP[def.color].badge}`}>
                    <def.icon className="h-3 w-3" />
                    {stats.stageCount[i]}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {stats.notStarted > 0 && (
            <p className="mt-1.5 text-xs text-slate-400">{stats.notStarted} not started</p>
          )}
        </div>
        <div className="kpi-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Won</p>
          <h3 className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.won}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {stats.totalRevenue > 0 ? `₹${stats.totalRevenue.toLocaleString('en-IN')} revenue` : 'Completed leads'}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Lost</p>
          <h3 className="mt-2 text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.lost}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stats.completed} total completed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-slate-200/70 dark:border-slate-800/70">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 px-4 py-3.5 text-sm font-semibold transition-colors sm:flex-none sm:px-8 ${
                activeTab === tab.key
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800/50 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
              placeholder="Search by name, company, or email..."
            />
          </div>
          {activeTab === 'pending' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="input w-auto min-w-[160px]"
              >
                <option value="">All activities</option>
                {ACTIVITY_DEFS.map((def) => (
                  <option key={def.id} value={String(def.idx)}>
                    {def.label} — {def.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {loading || loadingActivities ? (
          <div className="grid gap-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : displayLeads.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {activeTab === 'pending'
              ? 'No pending follow-up leads found.'
              : 'No completed leads found.'}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'pending' ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {pendingLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex flex-col gap-4 px-4 py-4 transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between"
                    >
                      {/* Lead Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {lead.name || 'Unnamed Lead'}
                          </h3>
                          {lead.company && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Building2 className="h-3 w-3" />
                              {lead.company}
                            </span>
                          )}
                          {lead.currentStage >= 0 && (
                            <span className={`badge text-[10px] ${COLOR_MAP[ACTIVITY_DEFS[lead.currentStage].color].badge}`}>
                              {ACTIVITY_DEFS[lead.currentStage].title}
                            </span>
                          )}
                          {lead.currentStage === -1 && (
                            <span className="badge bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              Not Started
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {lead.assignedToName && (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" /> {lead.assignedToName}
                            </span>
                          )}
                          {lead.followUpDate && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" /> {formatDate(lead.followUpDate)}
                            </span>
                          )}
                          {lead.email && (
                            <span className="truncate max-w-[180px]">{lead.email}</span>
                          )}
                        </div>
                      </div>

                      {/* Activity Progress */}
                      <div className="flex items-center gap-4">
                        <ActivityStepper stageStatuses={lead.stageStatuses} currentStage={lead.currentStage} />

                        {/* Current Stage Status Badge */}
                        {lead.currentStage >= 0 && (
                          <span className={`badge text-[10px] ${getStatusColor(lead.stageStatuses[lead.currentStage])}`}>
                            {getStatusLabel(lead.currentStage, lead.stageStatuses[lead.currentStage])}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActivitiesLead(lead)}
                          className="btn-primary h-9 px-3 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open Activities
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {completedLeads.map((lead) => {
                    const isWon = lead.outcome === 'Won'
                    return (
                      <div
                        key={lead.id}
                        className="flex flex-col gap-4 px-4 py-4 transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between"
                      >
                        {/* Lead Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {lead.name || 'Unnamed Lead'}
                            </h3>
                            {lead.company && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Building2 className="h-3 w-3" />
                                {lead.company}
                              </span>
                            )}
                            <span
                              className={`badge text-[10px] font-bold ${
                                isWon
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                              }`}
                            >
                              {isWon ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                              {lead.outcome}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            {lead.assignedToName && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" /> {lead.assignedToName}
                              </span>
                            )}
                            {lead.completedAt && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {formatDate(lead.completedAt)}
                              </span>
                            )}
                            {lead.email && (
                              <span className="truncate max-w-[180px]">{lead.email}</span>
                            )}
                          </div>
                        </div>

                        {/* Outcome Details */}
                        <div className="flex items-center gap-3">
                          {isWon && lead.finalPrice && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800/50 dark:bg-emerald-900/20">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Revenue</p>
                              <p className="flex items-center gap-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                <IndianRupee className="h-3.5 w-3.5" />
                                {Number(lead.finalPrice).toLocaleString('en-IN')}
                              </p>
                            </div>
                          )}
                          {!isWon && lead.lostCategory && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 dark:border-rose-800/50 dark:bg-rose-900/20">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">Reason</p>
                              <p className="flex items-center gap-1 text-sm font-bold text-rose-700 dark:text-rose-300">
                                <Tag className="h-3 w-3" />
                                {lead.lostCategory}
                              </p>
                            </div>
                          )}

                          {/* Activity Progress (completed) */}
                          <ActivityStepper stageStatuses={lead.stageStatuses} currentStage={lead.currentStage} />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActivitiesLead(lead)}
                            className="btn-secondary h-9 px-3 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Footer count */}
        {!loading && !loadingActivities && displayLeads.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800/50 dark:text-slate-400">
            Showing {displayLeads.length} lead{displayLeads.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Lead Activities Modal */}
      <AnimatePresence>
        {activitiesLead && (
          <LeadActivitiesModal
            lead={activitiesLead}
            onClose={closeActivitiesModal}
            onPersist={handlePersistActivity}
            initialData={[{}, {}, {}, {}]}
            initialSaved={[false, false, false, false]}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
