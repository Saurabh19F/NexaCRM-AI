import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users, TrendingUp, IndianRupee, AlertTriangle,
  TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles,
  Activity, PlayCircle, ExternalLink, Mic, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { useLeadsStore } from '../../store/leadsStore'
import { useAuthStore } from '../../store/authStore'
import { aiAPI, callsAPI, dealsAPI, leadsAPI } from '../../services/api'
import { computeEmployeeSlaPerformance, computeLeadSlaSummary, getLeadAgingLevel } from '../../utils/leadSla'

const fmt = (n, { currency = '', percent = false } = {}) => {
  const value = Number(n || 0)
  if (percent) return `${value.toFixed(1)}%`
  if (currency) return `${currency}${(value / 100000).toFixed(1)}L`
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function KPICard({ title, value, change, period, icon: Icon, color, currency, percent = false }) {
  const isPositive = change >= 0
  const changeValue = Number.isFinite(Number(change)) ? Number(change).toFixed(1) : '0.0'
  const directionLabel = isPositive ? 'Up' : 'Down'
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="kpi-card"
    >
      <div className="flex items-start justify-between mb-2.5 sm:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <span className={`flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full
          ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
          {directionLabel} {Math.abs(Number(changeValue))}%
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
        {fmt(value, { currency, percent })}
      </p>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 leading-tight">{title}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{period}</p>
    </motion.div>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">
            {p.dataKey === 'revenue' ? `₹${(p.value / 100000).toFixed(1)}L` : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

const INSIGHT_ROUTES = {
  'Schedule Call':  '/communication',
  'Send Follow-up': '/communication',
  'View Profile':   '/customers',
  'Plan Campaign':  '/ai-engine',
}

const DASHBOARD_MONTHS = 6
const LEAD_SOURCE_COLORS = {
  facebook: '#1877f2',
  instagram: '#e1306c',
  linkedin: '#0077b5',
  website: '#8b5cf6',
  whatsapp: '#25d366',
  referral: '#f59e0b',
  email: '#0ea5e9',
  'google ads': '#f97316',
  'meta ads': '#ec4899',
}
const FUNNEL_COLORS = ['#7c3aed', '#9333ea', '#c026d3', '#db2777', '#f59e0b', '#10b981']

const parseDateOrNull = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addMonths = (date, offset) => new Date(date.getFullYear(), date.getMonth() + offset, 1)
const sameOrAfter = (date, start) => date && date.getTime() >= start.getTime()
const sameBefore = (date, end) => date && date.getTime() < end.getTime()

const formatRelativeTime = (value) => {
  const date = parseDateOrNull(value)
  if (!date) return 'Just now'
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / (60 * 1000)))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const formatMonthLabel = (date) =>
  date.toLocaleDateString('en-US', { month: 'short' })

const formatSourceLabel = (source) => {
  const text = String(source || 'Other').trim()
  if (!text) return 'Other'
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

const safePercentChange = (current, previous) => {
  if (!Number.isFinite(current)) return 0
  if (!Number.isFinite(previous) || previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

const getPagedResults = async (fetchPage, size = 200) => {
  const firstPage = await fetchPage({ page: 0, size })
  const rows = Array.isArray(firstPage?.content) ? [...firstPage.content] : []
  const totalPages = Math.max(1, Number(firstPage?.totalPages ?? 1))
  const total = Number(firstPage?.total ?? rows.length)

  if (totalPages > 1) {
    const pageRequests = []
    for (let page = 1; page < totalPages; page += 1) {
      pageRequests.push(fetchPage({ page, size }))
    }
    const remainingPages = await Promise.all(pageRequests)
    for (const pageData of remainingPages) {
      rows.push(...(Array.isArray(pageData?.content) ? pageData.content : []))
    }
  }

  return { rows, total }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { leads, fetchLeads } = useLeadsStore()
  const { user } = useAuthStore()
  const [timeTick, setTimeTick] = useState(Date.now())
  const [liveDeals, setLiveDeals] = useState([])
  const [liveInsights, setLiveInsights] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [recentCallSnapshots, setRecentCallSnapshots] = useState([])
  const [callSnapshotsLoading, setCallSnapshotsLoading] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)
  const [refreshingSection, setRefreshingSection] = useState('')
  const mountedRef = useRef(true)
  const loadSeqRef = useRef(0)
  const firstName = (user?.name || 'User').trim().split(/\s+/)[0]

  useEffect(() => {
    mountedRef.current = true
    const id = window.setInterval(() => setTimeTick(Date.now()), 60 * 1000)
    return () => {
      mountedRef.current = false
      window.clearInterval(id)
    }
  }, [])

  const loadDashboard = useCallback(async (options = {}) => {
    const silent = Boolean(options?.silent)
    const requestId = loadSeqRef.current + 1
    loadSeqRef.current = requestId

    if (!silent && mountedRef.current) {
      setDashboardLoading(true)
      setDashboardError('')
    }

    try {
      const [freshLeads, dealRowsResponse, insightsResponse] = await Promise.all([
        fetchLeads({
          size: 250,
          search: '',
          score: 'all',
          status: 'all',
          source: 'all',
          assignedTo: 'all',
        }),
        getPagedResults((params) => dealsAPI.getAll(params), 200),
        aiAPI.getInsights().catch(() => []),
      ])

      if (!mountedRef.current || loadSeqRef.current !== requestId) return

      const normalizedDeals = dealRowsResponse.rows
        .map((deal) => ({
          id: String(deal.id || ''),
          title: deal.title || 'Untitled Deal',
          company: deal.company || '',
          value: Number(deal.dealValue || 0),
          stage: String(deal.stage || 'NEW').toLowerCase(),
          priority: String(deal.priority || 'MEDIUM').toLowerCase(),
          score: String(deal.aiScore || 'WARM').toLowerCase(),
          owner: deal.ownerName || '',
          dueDate: deal.expectedCloseDate || '',
          activities: Number(deal.activitiesCount || 0),
          createdAt: deal.createdAt || '',
          updatedAt: deal.updatedAt || '',
          actualCloseDate: deal.actualCloseDate || '',
        }))
        .filter((deal) => deal.id)

      setLiveDeals(normalizedDeals)
      setLiveInsights(Array.isArray(insightsResponse) ? insightsResponse : [])

      const recentLeads = [...(freshLeads || [])]
        .filter((lead) => lead?.id)
        .sort((a, b) => {
          const left = new Date(b.lastContactedAtTs || b.lastActivityAtTs || b.createdAtTs || b.createdAt || 0).getTime()
          const right = new Date(a.lastContactedAtTs || a.lastActivityAtTs || a.createdAtTs || a.createdAt || 0).getTime()
          return left - right
        })
        .slice(0, 4)

      const [callResults, activityResults] = await Promise.all([
        Promise.allSettled(
          recentLeads.slice(0, 3).map(async (lead) => {
            const res = await callsAPI.getIntelligence(lead.id)
            const analysis = res?.analysis || {}
            const firstCall = Array.isArray(res?.calls) ? res.calls[0] : null
            return {
              leadId: lead.id,
              leadName: lead.name || 'Unknown lead',
              company: lead.company || '',
              currentStatus: lead.status || 'NEW',
              verdict: analysis.leadVerdict || 'UNCERTAIN',
              confidence: Number(analysis.confidence || 0),
              summary: analysis.summary || firstCall?.summary || '',
              recordingUrl: firstCall?.recordingUrl || '',
              calledAt: firstCall?.createdAt || lead.lastContactedAtTs || lead.lastActivityAtTs || lead.createdAtTs || '',
            }
          })
        ),
        Promise.allSettled(
          recentLeads.map(async (lead) => {
            const activities = await leadsAPI.getActivities(lead.id)
            return {
              lead,
              activities: Array.isArray(activities) ? activities : [],
            }
          })
        ),
      ])

      if (!mountedRef.current || loadSeqRef.current !== requestId) return

      setRecentCallSnapshots(
        callResults
          .filter((result) => result.status === 'fulfilled' && result.value)
          .map((result) => result.value)
      )

      const activityFeed = []

      for (const result of activityResults) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const { lead, activities } = result.value
        for (const activity of activities.slice(0, 2)) {
          const timestamp = parseDateOrNull(activity.savedAt || activity.createdAt || activity.updatedAt || lead.lastActivityAtTs || lead.createdAtTs)?.toISOString() || ''
          activityFeed.push({
            id: activity.id || `${lead.id}-${activity.activityId || activity.activityIndex || activity.activityTitle || 'activity'}`,
            type: String(activity.activityTitle || activity.activityLabel || 'note').toLowerCase(),
            text: activity.summary || activity.activityTitle || `${lead.name || 'Lead'} activity updated`,
            time: formatRelativeTime(activity.savedAt || activity.createdAt || activity.updatedAt || lead.lastActivityAtTs || lead.createdAtTs),
            user: activity.assignedTo || lead.assignedTo || 'System',
            avatar: String((activity.assignedTo || lead.assignedTo || 'S').trim().charAt(0) || 'S').toUpperCase(),
            timestamp,
          })
        }
      }

      for (const lead of recentLeads.slice(0, 3)) {
        const timestamp = parseDateOrNull(lead.createdAtTs || lead.createdAt)?.toISOString() || ''
        activityFeed.push({
          id: `lead-${lead.id}`,
          type: 'lead',
          text: `Lead ${lead.name || 'Unnamed lead'} from ${formatSourceLabel(lead.source)} is ${String(lead.status || 'new').toLowerCase()}`,
          time: formatRelativeTime(lead.createdAtTs || lead.createdAt),
          user: lead.assignedTo || 'System',
          avatar: String((lead.assignedTo || 'S').trim().charAt(0) || 'S').toUpperCase(),
          timestamp,
        })
      }

      setRecentActivity(
        activityFeed
          .sort((a, b) => {
            const left = parseDateOrNull(a.timestamp)?.getTime() || 0
            const right = parseDateOrNull(b.timestamp)?.getTime() || 0
            return right - left
          })
          .slice(0, 7)
      )
      setLastRefreshedAt(new Date().toISOString())
    } catch (err) {
      if (!mountedRef.current || loadSeqRef.current !== requestId) return
      setDashboardError(err?.message || 'Failed to load live dashboard data')
      setLiveDeals([])
      setLiveInsights([])
      setRecentActivity([])
    } finally {
      if (mountedRef.current && loadSeqRef.current === requestId && !silent) {
        setDashboardLoading(false)
      }
    }
  }, [fetchLeads])

  const refreshSection = useCallback(async (section = 'dashboard') => {
    setRefreshingSection(section)
    try {
      await loadDashboard({ silent: true })
    } finally {
      if (mountedRef.current) setRefreshingSection('')
    }
  }, [loadDashboard])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const id = window.setInterval(() => {
      loadDashboard({ silent: true })
    }, 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [loadDashboard])

  const agingCounts = useMemo(() => {
    const counts = { fresh: 0, warning: 0, critical: 0 }
    for (const lead of leads ?? []) {
      const level = getLeadAgingLevel(lead, timeTick)
      if (level === 'fresh' || level === 'warning' || level === 'critical') counts[level] += 1
    }
    return counts
  }, [leads, timeTick])

  const slaSummary = useMemo(() => computeLeadSlaSummary(leads ?? []), [leads])
  const employeePerf = useMemo(() => computeEmployeeSlaPerformance(leads ?? []).slice(0, 5), [leads])

  const liveLeads = leads ?? []
  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const previousMonthStart = addMonths(currentMonthStart, -1)
  const leadWindow = useMemo(() => {
    const total = liveLeads.length
    const currentMonthLeads = liveLeads.filter((lead) => sameOrAfter(parseDateOrNull(lead.createdAtTs || lead.createdAt), currentMonthStart))
    const previousMonthLeads = liveLeads.filter((lead) => {
      const date = parseDateOrNull(lead.createdAtTs || lead.createdAt)
      return date && sameOrAfter(date, previousMonthStart) && sameBefore(date, currentMonthStart)
    })
    const wonLeads = liveLeads.filter((lead) => String(lead.status || '').toUpperCase() === 'WON')
    const currentWonLeads = currentMonthLeads.filter((lead) => String(lead.status || '').toUpperCase() === 'WON')
    const previousWonLeads = liveLeads.filter((lead) => {
      const date = parseDateOrNull(lead.createdAtTs || lead.createdAt)
      return date && sameOrAfter(date, previousMonthStart) && sameBefore(date, currentMonthStart) && String(lead.status || '').toUpperCase() === 'WON'
    })
    const activeNow = liveDeals.filter((deal) => !['won', 'lost'].includes(String(deal.stage || '').toLowerCase())).length
    const activePrev = liveDeals.filter((deal) => {
      const date = parseDateOrNull(deal.createdAt || deal.updatedAt || deal.actualCloseDate)
      return date && sameOrAfter(date, previousMonthStart) && sameBefore(date, currentMonthStart) && !['won', 'lost'].includes(String(deal.stage || '').toLowerCase())
    }).length
    const wonRevenueCurrent = liveDeals.filter((deal) => {
      const date = parseDateOrNull(deal.actualCloseDate || deal.updatedAt || deal.createdAt)
      return date && sameOrAfter(date, currentMonthStart) && String(deal.stage || '').toLowerCase() === 'won'
    }).reduce((sum, deal) => sum + Number(deal.value || 0), 0)
    const wonRevenuePrevious = liveDeals.filter((deal) => {
      const date = parseDateOrNull(deal.actualCloseDate || deal.updatedAt || deal.createdAt)
      return date && sameOrAfter(date, previousMonthStart) && sameBefore(date, currentMonthStart) && String(deal.stage || '').toLowerCase() === 'won'
    }).reduce((sum, deal) => sum + Number(deal.value || 0), 0)
    const currentWonValues = liveDeals.filter((deal) => String(deal.stage || '').toLowerCase() === 'won').map((deal) => Number(deal.value || 0))
    const previousWonValues = liveDeals.filter((deal) => {
      const date = parseDateOrNull(deal.actualCloseDate || deal.updatedAt || deal.createdAt)
      return date && sameOrAfter(date, previousMonthStart) && sameBefore(date, currentMonthStart) && String(deal.stage || '').toLowerCase() === 'won'
    }).map((deal) => Number(deal.value || 0))
    const avgCurrentDeal = currentWonValues.length ? currentWonValues.reduce((sum, value) => sum + value, 0) / currentWonValues.length : 0
    const avgPreviousDeal = previousWonValues.length ? previousWonValues.reduce((sum, value) => sum + value, 0) / previousWonValues.length : 0

    return {
      total,
      currentMonthLeads: currentMonthLeads.length,
      previousMonthLeads: previousMonthLeads.length,
      activeNow,
      activePrev,
      wonRevenueCurrent,
      wonRevenuePrevious,
      currentWonCount: currentWonLeads.length,
      previousWonCount: previousWonLeads.length,
      avgCurrentDeal,
      avgPreviousDeal,
      wonLeads: wonLeads.length,
    }
  }, [liveDeals, liveLeads, currentMonthStart, previousMonthStart])

  const monthlyRevenue = useMemo(() => {
    const buckets = []
    for (let i = DASHBOARD_MONTHS - 1; i >= 0; i -= 1) {
      const start = addMonths(currentMonthStart, -i)
      const end = addMonths(start, 1)
      const wonDeals = liveDeals.filter((deal) => {
        const date = parseDateOrNull(deal.actualCloseDate || deal.updatedAt || deal.createdAt)
        return date && sameOrAfter(date, start) && sameBefore(date, end) && String(deal.stage || '').toLowerCase() === 'won'
      })
      buckets.push({
        month: formatMonthLabel(start),
        revenue: wonDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0),
        deals: wonDeals.length,
      })
    }
    return buckets
  }, [liveDeals, currentMonthStart])

  const funnelData = useMemo(() => {
    const stages = [
      { key: 'new', label: 'New Leads' },
      { key: 'contacted', label: 'Contacted' },
      { key: 'qualified', label: 'Qualified' },
      { key: 'proposal', label: 'Proposal' },
      { key: 'negotiation', label: 'Negotiation' },
      { key: 'won', label: 'Won' },
    ]
    return stages.map((stage, index) => ({
      stage: stage.label,
      count: liveLeads.filter((lead) => String(lead.status || '').toLowerCase() === stage.key).length,
      color: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
    }))
  }, [liveLeads])

  const leadSources = useMemo(() => {
    const totals = new Map()
    for (const lead of liveLeads) {
      const source = formatSourceLabel(lead.source)
      totals.set(source, (totals.get(source) || 0) + 1)
    }
    const totalLeads = liveLeads.length || 1
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        value: Math.round((count / totalLeads) * 100),
        color: LEAD_SOURCE_COLORS[String(name).toLowerCase()] || '#8b5cf6',
      }))
  }, [liveLeads])

  const dashboardKpis = useMemo(() => ({
    totalLeads: {
      value: leadWindow.total,
      change: safePercentChange(leadWindow.currentMonthLeads, leadWindow.previousMonthLeads),
      period: 'this month vs last month',
    },
    totalDeals: {
      value: leadWindow.activeNow,
      change: safePercentChange(leadWindow.activeNow, leadWindow.activePrev),
      period: 'open deals vs last month',
    },
    revenue: {
      value: leadWindow.wonRevenueCurrent,
      change: safePercentChange(leadWindow.wonRevenueCurrent, leadWindow.wonRevenuePrevious),
      period: 'won revenue this month vs last month',
    },
    overdueTasks: {
      value: slaSummary.unattendedCritical,
      change: safePercentChange(slaSummary.unattendedCritical, Math.max(1, Math.floor(slaSummary.total / 4))),
      period: 'critical leads now vs baseline',
    },
    conversionRate: {
      value: leadWindow.total > 0 ? (leadWindow.wonLeads / leadWindow.total) * 100 : 0,
      change: safePercentChange(
        leadWindow.currentMonthLeads > 0 ? (leadWindow.currentWonCount / leadWindow.currentMonthLeads) * 100 : 0,
        leadWindow.previousMonthLeads > 0 ? (leadWindow.previousWonCount / leadWindow.previousMonthLeads) * 100 : 0
      ),
      period: 'won leads rate vs last month',
    },
    avgDealSize: {
      value: leadWindow.avgCurrentDeal || 0,
      change: safePercentChange(leadWindow.avgCurrentDeal, leadWindow.avgPreviousDeal),
      period: 'won deal average this month vs last month',
    },
  }), [leadWindow, slaSummary])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, {firstName} 👋 — Here&apos;s your overview</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefreshedAt && (
            <span className="hidden sm:inline-flex text-[11px] text-slate-500 dark:text-slate-400">
              Updated {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => loadDashboard()}
            disabled={dashboardLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
            title="Refresh live dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dashboardLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {(dashboardLoading || dashboardError) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${dashboardError ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200' : 'border-slate-200 bg-white/70 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'}`}>
          {dashboardError || 'Refreshing live dashboard data…'}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPICard title="Total Leads"        value={dashboardKpis.totalLeads.value}     change={dashboardKpis.totalLeads.change}     period={dashboardKpis.totalLeads.period}     icon={Users}          color="bg-gradient-to-br from-violet-500 to-fuchsia-600" />
        <KPICard title="Active Deals"       value={dashboardKpis.totalDeals.value}     change={dashboardKpis.totalDeals.change}     period={dashboardKpis.totalDeals.period}     icon={TrendingUp}     color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <KPICard title="Revenue (MTD)"      value={dashboardKpis.revenue.value}        change={dashboardKpis.revenue.change}        period={dashboardKpis.revenue.period}        icon={IndianRupee}    color="bg-gradient-to-br from-cyan-500 to-blue-600" currency="₹" />
        <KPICard title="Overdue Tasks"      value={dashboardKpis.overdueTasks.value}   change={dashboardKpis.overdueTasks.change}   period={dashboardKpis.overdueTasks.period}   icon={AlertTriangle}  color="bg-gradient-to-br from-orange-500 to-rose-600" />
        <KPICard title="Conversion Rate"    value={dashboardKpis.conversionRate.value} change={dashboardKpis.conversionRate.change} period={dashboardKpis.conversionRate.period} icon={Activity}       color="bg-gradient-to-br from-fuchsia-500 to-pink-600" percent />
        <KPICard title="Avg Deal Size"      value={dashboardKpis.avgDealSize.value}    change={dashboardKpis.avgDealSize.change}    period={dashboardKpis.avgDealSize.period}    icon={TrendingUp}     color="bg-gradient-to-br from-amber-500 to-orange-600" currency="₹" />
      </div>

      {/* Lead Aging + SLA Monitoring */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Lead Aging Monitor</h2>
              <button
                type="button"
                onClick={() => refreshSection('aging')}
                className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh this widget"
                aria-label="Refresh lead aging monitor"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'aging' ? 'animate-spin text-slate-600' : ''}`} />
              </button>
            </div>
            <span className="text-xs text-slate-500">Live SLA bands</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Fresh (0-15 min)</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{agingCounts.fresh}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Warning (15-60 min)</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{agingCounts.warning}</p>
            </div>
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">Critical (60+ min)</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{agingCounts.critical}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3">
              <p className="text-[11px] text-slate-500">Unattended 1+ hr</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{slaSummary.unattendedCritical}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3">
              <p className="text-[11px] text-slate-500">Avg response</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {slaSummary.avgResponseMinutes === null ? '--' : `${(slaSummary.avgResponseMinutes / 60).toFixed(1)}h`}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3">
              <p className="text-[11px] text-slate-500">SLA met</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{slaSummary.met}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3">
              <p className="text-[11px] text-slate-500">SLA breached</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{slaSummary.breached}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Employee SLA Performance</h2>
            <button
              type="button"
              onClick={() => refreshSection('employee')}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh this widget"
              aria-label="Refresh employee SLA performance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'employee' ? 'animate-spin text-slate-600' : ''}`} />
            </button>
          </div>
          <div className="space-y-2">
            {employeePerf.length === 0 && (
              <p className="text-xs text-slate-400">No employee data yet.</p>
            )}
            {employeePerf.map((row) => (
              <div key={row.owner} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{row.owner}</p>
                  <span className="text-[10px] text-slate-500">{row.total} leads</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400">Met {row.met}</span>
                  <span className="text-red-600 dark:text-red-400">Breached {row.breached}</span>
                  <span className="text-amber-600 dark:text-amber-400">Unattended {row.unattended}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Revenue & Deals</h2>
              <button
                type="button"
                onClick={() => refreshSection('revenue')}
                className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh this widget"
                aria-label="Refresh revenue widget"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'revenue' ? 'animate-spin text-slate-600' : ''}`} />
              </button>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="revenue" orientation="left" tickFormatter={(v) => `₹${v / 100000}L`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="deals" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradRevenue)" />
              <Area yAxisId="deals"   type="monotone" dataKey="deals"   name="Deals"   stroke="#10b981" strokeWidth={2.5} fill="url(#gradDeals)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Lead Sources</h2>
            <button
              type="button"
              onClick={() => refreshSection('sources')}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh this widget"
              aria-label="Refresh lead sources widget"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'sources' ? 'animate-spin text-slate-600' : ''}`} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={leadSources} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {leadSources.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-3">
            {leadSources.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                {s.name} <span className="text-slate-400">({s.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent call recordings */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Recent Call Recordings</h2>
              <button
                type="button"
                onClick={() => refreshSection('calls')}
                className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh this widget"
                aria-label="Refresh recent call recordings widget"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'calls' ? 'animate-spin text-slate-600' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-slate-500">Pulled from Bolna-backed call intelligence</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Mic className="w-3.5 h-3.5" />
            Live call review
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {callSnapshotsLoading && recentCallSnapshots.length === 0 && (
            <div className="col-span-full text-sm text-slate-500">Loading call recordings…</div>
          )}
          {!callSnapshotsLoading && recentCallSnapshots.length === 0 && (
            <div className="col-span-full text-sm text-slate-500">No call recordings available yet.</div>
          )}

          {recentCallSnapshots.map((item) => (
            <div key={item.leadId} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.leadName}</p>
                  <p className="text-[11px] text-slate-500">{item.company || 'No company'} · {item.currentStatus}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                  {item.verdict}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">AI Review</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1 line-clamp-3">
                  {item.summary || 'No summary available yet.'}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Confidence {item.confidence}%
                </span>
                {item.recordingUrl ? (
                  <a
                    href={item.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Open recording
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">No recording URL yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Funnel */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Sales Funnel</h2>
            <button
              type="button"
              onClick={() => refreshSection('funnel')}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh this widget"
              aria-label="Refresh sales funnel widget"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'funnel' ? 'animate-spin text-slate-600' : ''}`} />
            </button>
          </div>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const pct = Math.round((stage.count / Math.max(1, funnelData[0]?.count || 1)) * 100)
              return (
                <div key={stage.stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{stage.stage}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {stage.count.toLocaleString()}
                      <span className="text-slate-400 font-medium ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-lg"
                      style={{ background: stage.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-fuchsia-500" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">AI Insights</h2>
            <button
              type="button"
              onClick={() => refreshSection('insights')}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh this widget"
              aria-label="Refresh AI insights widget"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'insights' ? 'animate-spin text-slate-600' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            {liveInsights.map((insight) => (
              <div key={insight.id} className={`rounded-xl p-3 border text-xs space-y-1.5
                ${insight.type === 'prediction' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40' :
                  insight.type === 'warning'    ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/40' :
                  insight.type === 'opportunity'? 'bg-violet-50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-800/40' :
                  'bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950/20 dark:border-fuchsia-800/40'}`}>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{insight.title}</p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{insight.body}</p>
                <button
                  onClick={() => navigate(INSIGHT_ROUTES[insight.action] ?? '/dashboard')}
                  className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                  {insight.action} →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Recent Activity</h2>
            <button
              type="button"
              onClick={() => refreshSection('activity')}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh this widget"
              aria-label="Refresh recent activity widget"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingSection === 'activity' ? 'animate-spin text-slate-600' : ''}`} />
            </button>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-64 custom-scrollbar pr-1">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0 font-medium">
                  {item.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{item.text}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.time} · {item.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
