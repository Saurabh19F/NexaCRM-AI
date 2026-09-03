import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ClipboardList,
  RefreshCw,
  Search,
  User,
  Phone,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Building2,
  CalendarDays,
  Eye,
  History,
  IndianRupee,
  Tag,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeading from '../components/ui/PageHeading'
import LeadActivitiesModal from '../components/LeadActivitiesModal'
import { leadsAPI, tasksAPI } from '../services/api'

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  return []
}

const TABS = [
  { key: 'welcome_call', label: 'Welcome Call', stageIdx: 0 },
  { key: 'followup_meeting', label: 'Follow-up Meeting', stageIdx: 1 },
  { key: 'meeting_outcome', label: 'Meeting Outcome', stageIdx: 2 },
  { key: 'completed', label: 'Completed Leads', stageIdx: null },
]

const LEADS_PER_PAGE = 8

const ACTIVITY_DEFS = [
  { idx: 0, id: 'act01', label: 'Activity 01', title: 'Welcome Call', icon: Phone, color: 'red' },
  { idx: 1, id: 'act02', label: 'Activity 02', title: 'Follow Up for Meeting', icon: Clock, color: 'blue' },
  { idx: 2, id: 'act03', label: 'Activity 03', title: 'Meeting Outcome', icon: Trophy, color: 'green' },
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
const normalizeStatusText = (v) => normalizeOutcome(v).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()

const activityTimestamp = (activity, fallback = 0) => {
  const time = new Date(activity?.savedAt || activity?.createdAt || activity?.updatedAt || 0).getTime()
  return Number.isNaN(time) ? fallback : time
}

const getActivityIndex = (activity) => {
  const numeric = Number(activity?.activityIndex)
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 3) return numeric

  const label = `${activity?.activityLabel || ''} ${activity?.activityTitle || ''} ${activity?.summary || ''}`.toLowerCase()
  if (label.includes('01') || label.includes('welcome call') || label.includes('call outcome')) return 0
  if (label.includes('02') || label.includes('follow up for meeting')) return 1
  if (label.includes('03') || label.includes('allowed person')) return 2
  if (label.includes('04') || label.includes('meeting outcome')) return 3
  return -1
}

const getStageStatus = (stageIdx, values = {}) => {
  const status = normalizeStatusText(values.status || values.connectionStatus || values.callOutcome || values.outcome || values.meetingStatus || '')
  if (stageIdx === 0) {
    if (status === 'connected') return 'connected'
    if (status === 'not connected' || status === 'non connected' || status === 'no answer') return 'not_connected'
    return 'done'
  }
  if (stageIdx === 1) {
    if (status === 'meeting') return 'meeting'
    if (status === 'follow up' || status === 'followup') return 'follow_up'
    if (status === 'not interested') return 'not_interested'
    return 'done'
  }
  if (stageIdx === 2) {
    if (status === 'successful' || status === 'success') return 'successful'
    if (status === 'reschedule' || status === 'rescheduled' || status === 'failed' || status === 'failure') return 'reschedule'
    return 'done'
  }
  if (stageIdx === 3) {
    if (status === 'won' || status === 'win' || status === 'closed won') return 'won'
    if (status === 'lost' || status === 'close lost' || status === 'closed lost') return 'lost'
    if (status === 'negotiation') return 'negotiation'
    if (status === 'hold' || status === 'follow up' || status === 'followup') return 'hold'
    if (status === 'pending' || status === 'pending review' || status === 'pending decision') return 'pending_review'
    return 'done'
  }
  return 'done'
}

function parseLeadActivities(activities) {
  const stages = [null, null, null, null]
  const stageValues = [{}, {}, {}, {}]
  let latestActivity = null
  let currentStage = -1

  for (const act of activities) {
    const idx = getActivityIndex(act)

    if (idx >= 0) {
      const ts = activityTimestamp(act)
      const prev = stages[idx]
      if (!prev || ts > activityTimestamp(prev)) {
        stages[idx] = act
        stageValues[idx] = act.values || {}
      }

      if (!latestActivity || ts > activityTimestamp(latestActivity)) {
        latestActivity = act
        currentStage = idx
      }
    }
  }

  let isCompleted = false
  let outcome = null
  let completedAt = null
  let finalPrice = null
  let lostCategory = null

  if (currentStage === 3 && latestActivity) {
    const v = latestActivity.values || {}
    const status = normalizeStatusText(v.status || v.outcome)
    if (status === 'won' || status === 'win' || status === 'closed won') {
      isCompleted = true
      outcome = 'Won'
      completedAt = latestActivity.savedAt || latestActivity.createdAt
      finalPrice = v.meetingPriceFinal || null
    } else if (status === 'lost' || status === 'close lost' || status === 'closed lost') {
      isCompleted = true
      outcome = 'Lost'
      completedAt = latestActivity.savedAt || latestActivity.createdAt
      lostCategory = v.lostCategory || null
    }
  }

  const stageStatuses = stages.map((s, i) => {
    if (!s) return 'not_started'
    return getStageStatus(i, stageValues[i])
  })

  return { stages, stageValues, stageStatuses, currentStage, latestActivity, isCompleted, outcome, completedAt, finalPrice, lostCategory }
}

function getStatusLabel(stageIdx, status) {
  if (status === 'not_started') return 'Not Started'
  if (stageIdx === 0) {
    if (status === 'connected') return 'Connected'
    if (status === 'not_connected' || status === 'non_connected') return 'Not Connected'
  }
  if (stageIdx === 1) {
    if (status === 'meeting') return 'Meeting'
    if (status === 'follow_up') return 'Follow Up'
    if (status === 'not_interested') return 'Not Interested'
  }
  if (stageIdx === 2) {
    if (status === 'successful') return 'Successful'
    if (status === 'reschedule' || status === 'failed') return 'Reschedule'
  }
  if (stageIdx === 3) {
    if (status === 'won') return 'Won'
    if (status === 'lost') return 'Lost'
    if (status === 'negotiation') return 'Negotiation'
    if (status === 'hold') return 'Hold'
    if (status === 'pending_review' || status === 'pending') return 'Pending Review'
  }
  return 'Done'
}

function getStatusColor(status) {
  if (status === 'not_started') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  if (status === 'connected' || status === 'meeting' || status === 'successful' || status === 'won')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (status === 'not_connected' || status === 'non_connected' || status === 'not_interested' || status === 'reschedule' || status === 'failed' || status === 'lost')
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  if (status === 'follow_up' || status === 'hold' || status === 'negotiation' || status === 'pending_review' || status === 'pending')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
}

const isCompletedTask = (task) => {
  const status = String(task?.status || '').toUpperCase()
  return status === 'COMPLETED' || status === 'DONE' || status === 'CLOSED'
}

const timestampMs = (value, fallback = Number.MAX_SAFE_INTEGER) => {
  if (!value) return fallback
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? fallback : time
}

const sortTasksByUrgency = (rows = []) => [...rows].sort((a, b) => {
  const aDone = isCompletedTask(a)
  const bDone = isCompletedTask(b)
  if (aDone !== bDone) return aDone ? 1 : -1
  if (!aDone) {
    return timestampMs(a.dueDate || a.createdAt) - timestampMs(b.dueDate || b.createdAt)
  }
  return timestampMs(b.completedAt || b.updatedAt || b.createdAt, 0) - timestampMs(a.completedAt || a.updatedAt || a.createdAt, 0)
})

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const taskStatusLabel = (task) => String(task?.status || 'PENDING').replace(/_/g, ' ')

const activityNote = (activity) => {
  if (activity?.summary) return activity.summary
  const values = activity?.values || {}
  return Object.entries(values)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || 'Activity saved'
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
  const [tasks, setTasks] = useState([])
  const [leadActivities, setLeadActivities] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingCompletedTasks, setLoadingCompletedTasks] = useState(false)
  const [completedTasksLoaded, setCompletedTasksLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('welcome_call')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activitiesLead, setActivitiesLead] = useState(null)
  const [historyLead, setHistoryLead] = useState(null)
  const [historyLoadingLeadId, setHistoryLoadingLeadId] = useState(null)

  const loadAllActivities = useCallback(async (leadRows) => {
    const leadIds = Array.from(new Set((leadRows || []).map((lead) => lead?.id).filter(Boolean)))
    if (!leadIds.length) {
      return
    }
    setLoadingActivities(true)
    try {
      const results = leadIds.reduce((acc, leadId) => {
        acc[leadId] = []
        return acc
      }, {})
      const bulkBatchSize = 50
      const bulkBatches = []
      for (let i = 0; i < leadIds.length; i += bulkBatchSize) {
        bulkBatches.push(leadIds.slice(i, i + bulkBatchSize))
      }

      const responses = await Promise.allSettled(
        bulkBatches.map((batch) => leadsAPI.getActivitiesBulk(batch))
      )
      const failedLeadIds = []
      responses.forEach((res, index) => {
        const batch = bulkBatches[index]
        if (res.status === 'fulfilled') {
          const payload = res.value || {}
          batch.forEach((leadId) => {
            results[leadId] = unwrapList(payload[leadId])
          })
        } else {
          failedLeadIds.push(...batch)
        }
      })

      if (failedLeadIds.length) {
        for (let i = 0; i < failedLeadIds.length; i += 10) {
          const batch = failedLeadIds.slice(i, i + 10)
          const fallbackResponses = await Promise.allSettled(
            batch.map((leadId) => leadsAPI.getActivities(leadId))
          )
          fallbackResponses.forEach((res, j) => {
            const leadId = batch[j]
            results[leadId] = res.status === 'fulfilled' ? unwrapList(res.value) : []
          })
        }
      }

      setLeadActivities((prev) => ({ ...prev, ...results }))
    } catch (err) {
      const results = {}
      let failedCount = 0
      const batchSize = 10
      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize)
        const responses = await Promise.allSettled(
          batch.map((leadId) => leadsAPI.getActivities(leadId))
        )
        responses.forEach((res, j) => {
          const leadId = batch[j]
          if (res.status === 'fulfilled') {
            results[leadId] = unwrapList(res.value)
          } else {
            failedCount += 1
            results[leadId] = []
          }
        })
      }
      setLeadActivities((prev) => ({ ...prev, ...results }))
      if (failedCount >= leadIds.length) {
        toast.error('Unable to load activity data')
      }
    } finally {
      setLoadingActivities(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setCompletedTasksLoaded(false)
    setLoadingCompletedTasks(false)
    setLeadActivities({})
    try {
      const [leadResponse, pendingTaskResponse] = await Promise.all([
        leadsAPI.getAll({ page: 0, size: 500, sort: 'createdAt,desc' }),
        tasksAPI.getAll({ status: 'PENDING' }),
      ])
      const leadRows = unwrapList(leadResponse)
      const pendingTaskRows = unwrapList(pendingTaskResponse)
      const leadById = new Map(leadRows.map((lead) => [lead.id, lead]))
      const visiblePendingTaskRows = pendingTaskRows.filter((task) => task.leadId && leadById.has(task.leadId))
      const taskLeadRows = Array.from(
        new Map(
          visiblePendingTaskRows
            .map((task) => leadById.get(task.leadId))
            .filter(Boolean)
            .map((lead) => [lead.id, lead])
        ).values()
      )

      setLeads(leadRows)
      setTasks(visiblePendingTaskRows)
      setLoading(false)
      loadAllActivities(taskLeadRows)

      setLoadingCompletedTasks(true)
      tasksAPI.getAll({ status: 'COMPLETED' })
        .then((completedTaskResponse) => {
          const completedTaskRows = unwrapList(completedTaskResponse)
            .filter((task) => task.leadId && leadById.has(task.leadId))
          setTasks((prev) => {
            const merged = new Map(prev.map((task) => [task.id, task]))
            completedTaskRows.forEach((task) => merged.set(task.id, task))
            return Array.from(merged.values())
          })
          const completedLeadRows = Array.from(
            new Map(
              completedTaskRows
                .map((task) => leadById.get(task.leadId))
                .filter(Boolean)
                .map((lead) => [lead.id, lead])
            ).values()
          )
          setCompletedTasksLoaded(true)
          loadAllActivities(completedLeadRows)
        })
        .catch(() => {
          setCompletedTasksLoaded(true)
        })
        .finally(() => {
          setLoadingCompletedTasks(false)
        })
    } catch (err) {
      toast.error(err?.message || 'Unable to load task follow-up data')
      setLoading(false)
    }
  }, [loadAllActivities])

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  const ensureLeadActivities = useCallback(async (leadId) => {
    if (!leadId || leadActivities[leadId]) return
    setHistoryLoadingLeadId(leadId)
    try {
      const acts = await leadsAPI.getActivities(leadId)
      setLeadActivities((prev) => ({ ...prev, [leadId]: unwrapList(acts) }))
    } catch (err) {
      toast.error(err?.message || 'Unable to load lead history')
    } finally {
      setHistoryLoadingLeadId(null)
    }
  }, [leadActivities])

  const enrichedLeads = useMemo(() => {
    const leadById = new Map(leads.map((lead) => [lead.id, lead]))
    const tasksByLead = tasks.reduce((acc, task) => {
      if (!task.leadId) return acc
      if (!acc.has(task.leadId)) acc.set(task.leadId, [])
      acc.get(task.leadId).push(task)
      return acc
    }, new Map())

    const baseLeads = tasksByLead.size
      ? Array.from(tasksByLead.keys())
          .map((leadId) => leadById.get(leadId))
          .filter(Boolean)
          .map((lead) => ({ ...lead, leadExists: true }))
      : leads.map((lead) => ({ ...lead, leadExists: true }))

    return baseLeads.map((lead) => {
      const activities = leadActivities[lead.id] || []
      const parsed = parseLeadActivities(activities)
      const leadTasks = sortTasksByUrgency(tasksByLead.get(lead.id) || [])
      const pendingTasks = leadTasks.filter((task) => !isCompletedTask(task))
      const completedTasks = leadTasks.filter(isCompletedTask)
      const nextTask = pendingTasks[0]
      const latestTask = leadTasks[0]

      return {
        ...lead,
        ...parsed,
        activityCount: activities.length,
        tasks: leadTasks,
        pendingTaskCount: pendingTasks.length,
        completedTaskCount: completedTasks.length,
        nextTask,
        latestTask,
        taskDriven: leadTasks.length > 0,
      }
    })
  }, [leads, leadActivities, tasks])

  const stageLeads = useMemo(() => {
    const isPending = (l) => tasks.length ? l.pendingTaskCount > 0 : !l.isCompleted
    let pendingAll = enrichedLeads.filter(isPending)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      pendingAll = pendingAll.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(q) ||
          (l.company || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          (l.nextTask?.title || '').toLowerCase().includes(q)
      )
    }
    const sorter = (a, b) => timestampMs(a.nextTask?.dueDate || a.followUpDate || a.createdAt) - timestampMs(b.nextTask?.dueDate || b.followUpDate || b.createdAt)
    return {
      welcome_call: pendingAll.filter((l) => l.currentStage <= 0).sort(sorter),
      followup_meeting: pendingAll.filter((l) => l.currentStage === 1).sort(sorter),
      meeting_outcome: pendingAll.filter((l) => l.currentStage === 2 || l.currentStage === 3).sort(sorter),
    }
  }, [enrichedLeads, searchQuery, tasks.length])

  const completedLeads = useMemo(() => {
    let filtered = enrichedLeads.filter((l) => (
      tasks.length
        ? l.pendingTaskCount === 0 && (l.completedTaskCount > 0 || l.isCompleted)
        : l.isCompleted
    ))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(q) ||
          (l.company || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          (l.latestTask?.title || '').toLowerCase().includes(q)
      )
    }
    return filtered.sort((a, b) => timestampMs(b.latestTask?.completedAt || b.completedAt || b.updatedAt, 0) - timestampMs(a.latestTask?.completedAt || a.completedAt || a.updatedAt, 0))
  }, [enrichedLeads, searchQuery, tasks.length])

  const stats = useMemo(() => {
    const isPending = (l) => tasks.length ? l.pendingTaskCount > 0 : !l.isCompleted
    const pending = enrichedLeads.filter(isPending)
    const completed = tasks.length
      ? enrichedLeads.filter((l) => l.pendingTaskCount === 0 && (l.completedTaskCount > 0 || l.isCompleted))
      : enrichedLeads.filter((l) => l.isCompleted)
    const won = completed.filter((l) => l.outcome === 'Won')
    const lost = completed.filter((l) => l.outcome === 'Lost')
    const totalRevenue = won.reduce((sum, l) => sum + Number(l.finalPrice || 0), 0)
    return {
      welcomeCall: pending.filter((l) => l.currentStage <= 0).length,
      followupMeeting: pending.filter((l) => l.currentStage === 1).length,
      meetingOutcome: pending.filter((l) => l.currentStage === 2 || l.currentStage === 3).length,
      completed: completed.length,
      won: won.length,
      lost: lost.length,
      totalRevenue,
    }
  }, [enrichedLeads, tasks.length])

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

  const displayLeads = activeTab === 'completed' ? completedLeads : (stageLeads[activeTab] || [])
  const totalPages = Math.max(1, Math.ceil(displayLeads.length / LEADS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = displayLeads.length ? (safeCurrentPage - 1) * LEADS_PER_PAGE + 1 : 0
  const pageEnd = Math.min(safeCurrentPage * LEADS_PER_PAGE, displayLeads.length)
  const paginatedLeads = useMemo(() => {
    const start = (safeCurrentPage - 1) * LEADS_PER_PAGE
    return displayLeads.slice(start, start + LEADS_PER_PAGE)
  }, [displayLeads, safeCurrentPage])
  const historyLeadData = historyLead
    ? enrichedLeads.find((lead) => lead.id === historyLead.id) || historyLead
    : null
  const historyActivities = historyLeadData ? (leadActivities[historyLeadData.id] || []) : []
  const historyTasks = historyLeadData?.tasks || []
  const historyStats = {
    totalTasks: historyTasks.length,
    doneTasks: historyTasks.filter(isCompletedTask).length,
    pendingTasks: historyTasks.filter((task) => !isCompletedTask(task)).length,
    activities: historyActivities.length,
  }
  const historyEvents = [
    ...historyTasks.map((task) => {
      const completed = isCompletedTask(task)
      const timestamp = completed
        ? task.completedAt || task.updatedAt || task.createdAt
        : task.dueDate || task.createdAt
      return {
        id: `task-${task.id}`,
        kind: 'task',
        title: task.title || 'Follow-up task',
        status: taskStatusLabel(task),
        description: task.description || '',
        owner: task.assignedToName || task.createdByName || historyLeadData?.assignedToName || 'Unassigned',
        timestamp,
        sortGroup: completed ? 1 : 0,
        sortTime: completed ? timestampMs(timestamp, 0) * -1 : timestampMs(timestamp),
        completed,
        priority: task.priority || 'MEDIUM',
      }
    }),
    ...historyActivities.map((activity, index) => ({
      id: `activity-${activity.id || index}`,
      kind: 'activity',
      title: activity.activityTitle || activity.activityLabel || 'Lead activity',
      status: activity.activityLabel || `Activity ${Number(activity.activityIndex ?? index) + 1}`,
      description: activityNote(activity),
      owner: activity.assignedTo || historyLeadData?.assignedToName || 'Unassigned',
      timestamp: activity.savedAt || activity.createdAt || activity.updatedAt,
      sortGroup: 2,
      sortTime: timestampMs(activity.savedAt || activity.createdAt || activity.updatedAt, 0) * -1,
      completed: true,
      priority: 'DONE',
    })),
  ].sort((a, b) => (a.sortGroup - b.sortGroup) || (a.sortTime - b.sortTime))

  const openHistoryLead = (lead) => {
    setHistoryLead(lead)
    if (lead.leadExists !== false) {
      ensureLeadActivities(lead.id)
    }
  }

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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi-card cursor-pointer transition hover:ring-2 hover:ring-red-300 dark:hover:ring-red-700" onClick={() => setActiveTab('welcome_call')}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <Phone className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Welcome Call</p>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{loadingActivities ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : stats.welcomeCall}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Leads awaiting first call</p>
        </div>
        <div className="kpi-card cursor-pointer transition hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-700" onClick={() => setActiveTab('followup_meeting')}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Follow-up Meeting</p>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{loadingActivities ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : stats.followupMeeting}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Leads awaiting meeting</p>
        </div>
        <div className="kpi-card cursor-pointer transition hover:ring-2 hover:ring-emerald-300 dark:hover:ring-emerald-700" onClick={() => setActiveTab('meeting_outcome')}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Meeting Outcome</p>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{loadingActivities ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : stats.meetingOutcome}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Leads pending outcome</p>
        </div>
        <div className="kpi-card cursor-pointer transition hover:ring-2 hover:ring-brand-300 dark:hover:ring-brand-700" onClick={() => setActiveTab('completed')}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Completed</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{loadingActivities ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : stats.completed}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {loadingActivities ? <span className="inline-block h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <>Won: {stats.won} · Lost: {stats.lost}{stats.totalRevenue > 0 ? ` · ₹${stats.totalRevenue.toLocaleString('en-IN')}` : ''}</>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-slate-200/70 dark:border-slate-800/70">
          {TABS.map((tab) => {
            const tabCount = tab.key === 'completed'
              ? completedLeads.length
              : (stageLeads[tab.key] || []).length
            return (
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
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.key
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {loadingActivities ? '…' : tabCount}
                </span>
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
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
        </div>

        {/* Content */}
        {loading || (activeTab !== 'completed' && loadingActivities) || (activeTab === 'completed' && loadingCompletedTasks && !completedTasksLoaded) ? (
          <div className="grid gap-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : displayLeads.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {activeTab === 'welcome_call' && 'No leads at the welcome call stage.'}
            {activeTab === 'followup_meeting' && 'No leads awaiting follow-up meeting.'}
            {activeTab === 'meeting_outcome' && 'No leads pending meeting outcome.'}
            {activeTab === 'completed' && 'No completed leads found.'}
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
              {activeTab !== 'completed' ? (() => {
                const tabDef = TABS.find((t) => t.key === activeTab)
                const tabStageIdx = tabDef?.stageIdx ?? 0
                const tabActivityDef = ACTIVITY_DEFS[tabStageIdx]
                const tabColor = tabActivityDef ? COLOR_MAP[tabActivityDef.color] : COLOR_MAP.red

                const formatValueKey = (key) =>
                  key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/[_-]+/g, ' ')
                    .replace(/^\w/, (c) => c.toUpperCase())
                    .trim()

                return (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {paginatedLeads.map((lead) => {
                      const stageIdx = lead.currentStage === 3 && tabStageIdx === 2 ? 3 : tabStageIdx
                      const stageStatus = lead.stageStatuses[stageIdx]
                      const stageVals = lead.stageValues?.[stageIdx] || {}
                      const valEntries = Object.entries(stageVals)
                        .filter(([, v]) => v != null && String(v).trim() !== '')
                        .slice(0, 5)

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
                              {/* Stage-specific status badge */}
                              {stageStatus && stageStatus !== 'not_started' ? (
                                <span className={`badge text-[10px] font-bold ${getStatusColor(stageStatus)}`}>
                                  {getStatusLabel(stageIdx, stageStatus)}
                                </span>
                              ) : (
                                <span className="badge bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {lead.taskDriven ? 'Task follow-up' : 'Not Started'}
                                </span>
                              )}
                              {lead.missingLead && (
                                <span className="badge bg-rose-100 text-[10px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                  Lead missing
                                </span>
                              )}
                              {lead.pendingTaskCount > 0 && (
                                <span className="badge bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                  {lead.pendingTaskCount} open task{lead.pendingTaskCount === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            {lead.nextTask?.title && (
                              <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                {lead.nextTask.title}
                              </p>
                            )}
                            {lead.missingLead && (
                              <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-300">
                                This is a real follow-up task, but its linked lead record is deleted or not accessible.
                              </p>
                            )}
                            {/* Stage-specific values */}
                            {valEntries.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {valEntries.map(([k, v]) => (
                                  <span key={k} className="inline-flex gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                                    <span className="font-medium text-slate-500 dark:text-slate-400">{formatValueKey(k)}:</span>
                                    <span className="text-slate-700 dark:text-slate-200">{String(v)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              {lead.assignedToName && (
                                <span className="inline-flex items-center gap-1">
                                  <User className="h-3 w-3" /> {lead.assignedToName}
                                </span>
                              )}
                              {(lead.nextTask?.dueDate || lead.followUpDate) && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" /> {formatDate(lead.nextTask?.dueDate || lead.followUpDate)}
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
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openHistoryLead(lead)}
                              className="btn-secondary h-9 px-3 text-xs"
                            >
                              <History className="h-3.5 w-3.5" />
                              History
                            </button>
                            {lead.leadExists !== false && (
                              <button
                                type="button"
                                onClick={() => setActivitiesLead(lead)}
                                className="btn-primary h-9 px-3 text-xs"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Open Activities
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })() : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {paginatedLeads.map((lead) => {
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
                            {lead.missingLead && (
                              <span className="badge bg-rose-100 text-[10px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                Lead missing
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
                              {lead.outcome || 'Completed'}
                            </span>
                            {lead.completedTaskCount > 0 && (
                              <span className="badge bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                {lead.completedTaskCount} task{lead.completedTaskCount === 1 ? '' : 's'} done
                              </span>
                            )}
                          </div>
                          {lead.latestTask?.title && (
                            <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                              {lead.latestTask.title}
                            </p>
                          )}
                          {lead.missingLead && (
                            <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-300">
                              This is a real completed task, but its linked lead record is deleted or not accessible.
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            {lead.assignedToName && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" /> {lead.assignedToName}
                              </span>
                            )}
                            {(lead.latestTask?.completedAt || lead.completedAt) && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {formatDate(lead.latestTask?.completedAt || lead.completedAt)}
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
                            onClick={() => openHistoryLead(lead)}
                            className="btn-primary h-9 px-3 text-xs"
                          >
                            <History className="h-3.5 w-3.5" />
                            History
                          </button>
                          {lead.leadExists !== false && (
                            <button
                              type="button"
                              onClick={() => setActivitiesLead(lead)}
                              className="btn-secondary h-9 px-3 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </button>
                          )}
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
        {!loading && displayLeads.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800/50 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {pageStart}-{pageEnd} of {displayLeads.length} lead{displayLeads.length === 1 ? '' : 's'}
              {loadingActivities ? ' · loading activity progress…' : ''}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="btn-secondary h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="btn-secondary h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lead History Drawer */}
      <AnimatePresence>
        {historyLeadData && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="h-full w-full max-w-xl overflow-y-auto border-l border-white/40 bg-white/90 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/95"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                    Lead History
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {historyLeadData.name || 'Unnamed Lead'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {[historyLeadData.company, historyLeadData.email, historyLeadData.phone || historyLeadData.phoneNumber || historyLeadData.mobileNumber].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryLead(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close history"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Tasks', historyStats.totalTasks, 'Total'],
                  ['Done', historyStats.doneTasks, 'Completed'],
                  ['Pending', historyStats.pendingTasks, 'Open'],
                  ['Activities', historyStats.activities, 'Saved'],
                ].map(([label, value, helper]) => (
                  <div key={label} className="rounded-2xl border border-white/50 bg-white/55 p-3 dark:border-slate-800/70 dark:bg-slate-900/60">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                    <p className="text-[10px] text-slate-400">{helper}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800/70 dark:bg-slate-900/50">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Timeline</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tasks and saved lead activities, newest first.</p>
                  </div>
                  {historyLoadingLeadId === historyLeadData.id && (
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {historyEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-800">
                    No task or activity history found for this lead.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyEvents.map((event) => {
                      const isTask = event.kind === 'task'
                      return (
                        <div key={event.id} className="flex gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/40">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            isTask
                              ? event.completed
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                              : 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-300'
                          }`}>
                            {isTask ? <ClipboardList className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.title}</p>
                              <span className={`badge text-[10px] ${
                                event.completed
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                              }`}>
                                {event.status}
                              </span>
                            </div>
                            {event.description && (
                              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{event.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" /> {event.owner}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {formatDateTime(event.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Activities Modal */}
      <AnimatePresence>
        {activitiesLead && (
          <LeadActivitiesModal
            lead={activitiesLead}
            onClose={closeActivitiesModal}
            onPersist={handlePersistActivity}
            initialData={[{}, {}, {}]}
            initialSaved={[false, false, false]}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
