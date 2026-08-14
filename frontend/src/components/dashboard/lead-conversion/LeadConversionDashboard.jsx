import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, Cell, ComposedChart, Legend, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, FunnelChart, Funnel, LabelList
} from 'recharts'
import {
  Activity, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Filter, FolderClock,
  Globe2, Layers3, LineChart as LineChartIcon, Repeat2, Sparkles,
  Target, TrendingDown, TrendingUp, Users, UserCheck
} from 'lucide-react'
import { dashboardAPI } from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'

const DATE_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL_SENT', label: 'Proposal Sent' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
]

const SOURCE_COLORS = [
  '#7c3aed',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#6366f1',
]

const STAGE_COLORS = {
  NEW: '#6366f1',
  ASSIGNED: '#a855f7',
  CONTACTED: '#3b82f6',
  INTERESTED: '#06b6d4',
  QUALIFIED: '#10b981',
  PROPOSAL_SENT: '#f59e0b',
  CONVERTED: '#22c55e',
  LOST: '#ef4444',
}

const KPI_CARDS = [
  { key: 'totalLeads', title: 'Total Leads', icon: Users, color: 'from-brand-500 to-accent-500' },
  { key: 'newLeads', title: 'New Leads', icon: Sparkles, color: 'from-cyan-500 to-brand-500' },
  { key: 'assignedLeads', title: 'Assigned', icon: Repeat2, color: 'from-cyan-500 to-sky-600' },
  { key: 'contactedLeads', title: 'Contacted', icon: Activity, color: 'from-cyan-500 to-sky-600' },
  { key: 'interestedLeads', title: 'Interested', icon: Globe2, color: 'from-emerald-500 to-teal-600' },
  { key: 'qualifiedLeads', title: 'Qualified', icon: Target, color: 'from-emerald-500 to-green-600' },
  { key: 'proposalSentLeads', title: 'Proposal Sent', icon: LineChartIcon, color: 'from-orange-500 to-amber-600' },
  { key: 'convertedLeads', title: 'Converted', icon: UserCheck, color: 'from-emerald-500 to-teal-600' },
  { key: 'lostLeads', title: 'Lost', icon: TrendingDown, color: 'from-rose-500 to-red-600' },
  { key: 'pendingFollowUps', title: 'Pending Follow-ups', icon: Clock3, color: 'from-amber-500 to-orange-600' },
  { key: 'conversionRate', title: 'Conv. Rate', icon: TrendingUp, color: 'from-emerald-500 to-teal-600', percent: true },
  { key: 'revenueFromConvertedLeads', title: 'Revenue', icon: FolderClock, color: 'from-cyan-500 to-blue-600', currency: true },
]

const ACTIVITY_PAGE_SIZE = 8
const ACTIVITY_FETCH_LIMIT = 32

const SPARKLINE_ACCESSORS = {
  totalLeads: (row) => Number(row.leadCount || 0),
  newLeads: (row) => Number(row.newCount || 0),
  assignedLeads: (row) => Number(row.assignedCount || 0),
  contactedLeads: (row) => Number(row.contactedCount || 0),
  interestedLeads: (row) => Number(row.interestedCount || 0),
  qualifiedLeads: (row) => Number(row.qualifiedCount || 0),
  proposalSentLeads: (row) => Number(row.proposalSentCount || 0),
  convertedLeads: (row) => Number(row.convertedCount || 0),
  lostLeads: (row) => Number(row.lostCount || 0),
  pendingFollowUps: (row) => Number(row.pendingFollowUpsCount || 0),
  conversionRate: (row) => {
    const total = Number(row.leadCount || 0)
    return total > 0 ? (Number(row.convertedCount || 0) * 100) / total : 0
  },
  revenueFromConvertedLeads: (row) => Number(row.revenueGenerated || 0),
}

const prettyNumber = (value) => {
  const n = Number(value || 0)
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Number.isInteger(n) ? `${n}` : n.toFixed(1)
}

const prettyCurrency = (value) => `₹${prettyNumber(Number(value || 0) / 100000)}L`

const prettyPercent = (value) => `${Number(value || 0).toFixed(1)}%`

const getTrendGranularity = (filter, startDate, endDate) => {
  if (filter === 'today' || filter === 'yesterday' || filter === 'thisWeek') return 'day'
  if (filter === 'thisMonth' || filter === 'lastMonth') return 'day'
  if (filter !== 'custom') return 'day'
  if (!startDate || !endDate) return 'day'
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'day'
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
  if (days <= 31) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

const formatDateRangeLabel = (filter, startDate, endDate) => {
  const selected = DATE_FILTERS.find((opt) => opt.value === filter)?.label || 'This Month'
  if (filter !== 'custom') return selected
  if (!startDate && !endDate) return 'Custom Range'
  return `${startDate || 'Start'} → ${endDate || 'End'}`
}

const metricValue = (metric, { currency = false, percent = false } = {}) => {
  if (!metric) return currency ? '₹0.0L' : percent ? '0.0%' : '0'
  if (currency) return prettyCurrency(metric.value)
  if (percent) return prettyPercent(metric.value)
  return prettyNumber(metric.value)
}

function MetricCard({ item, metric, sparkline = [] }) {
  const Icon = item.icon
  const change = Number(metric?.changePercent || 0)
  const positive = change >= 0
  const hasSparkline = sparkline.some((point) => Number(point.value || 0) > 0)
  const stroke = positive ? '#10b981' : '#f43f5e'
  return (
    <div className="kpi-card flex min-h-[84px] flex-col gap-1.5 overflow-hidden px-2.5 py-2 sm:px-3 sm:py-2.5">
      <div className="flex items-start gap-2.5">
        <div className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{item.title}</p>
          <p className="mt-0.5 text-2xl font-bold leading-none text-slate-900 dark:text-slate-50">
            {metricValue(metric, { currency: item.currency, percent: item.percent })}
          </p>
        </div>
        <span className={`shrink-0 text-[11px] font-bold leading-none ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
          {positive ? '↗' : '↘'}{prettyPercent(Math.abs(change))}
        </span>
      </div>
      <div className="h-6 w-full">
        {hasSparkline ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill={stroke}
                fillOpacity={0.12}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center rounded-md bg-slate-100/50 px-1.5 text-[9px] font-medium text-slate-400 dark:bg-slate-800/40 dark:text-slate-500">
            No trend yet
          </div>
        )}
      </div>
    </div>
  )
}

function SectionShell({ title, icon: Icon, subtitle, action }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-brand-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        {subtitle && <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function LoadingCard() {
  return <div className="h-[84px] w-full rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/30 animate-pulse" />
}

function ChartEmptyState({ label }) {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
      {label}
    </div>
  )
}

const formatActivityTime = (value) => {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function LeadConversionDashboard() {
  const { user } = useAuthStore()
  const isFullAccess = ['COMPANY_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role) || user?.role === 'PLATFORM_ADMIN'
  const dateFilterRef = useRef(null)
  const [filter, setFilter] = useState('thisMonth')
  const [dateMenuOpen, setDateMenuOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('conversion')
  const [sortDir, setSortDir] = useState('desc')
  const [summary, setSummary] = useState(null)
  const [funnel, setFunnel] = useState([])
  const [employees, setEmployees] = useState([])
  const [sources, setSources] = useState([])
  const [activities, setActivities] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [expandedEmployee, setExpandedEmployee] = useState(null)
  const [activityPage, setActivityPage] = useState(0)

  const trendGranularity = useMemo(() => getTrendGranularity(filter, startDate, endDate), [filter, startDate, endDate])

  const requestParams = useMemo(() => {
    const base = {
      filter,
      status: status === 'all' ? undefined : status,
      employeeId: employeeId || undefined,
    }
    if (filter === 'custom') {
      base.startDate = startDate || undefined
      base.endDate = endDate || undefined
    }
    return base
  }, [filter, startDate, endDate, employeeId, status])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setDateMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    const load = async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true)
        setError('')
      }
      try {
        const employeeParams = { ...requestParams, sortBy, sortDir }
        const [summaryRes, funnelRes, employeesRes, sourcesRes, activitiesRes, trendRes] = await Promise.all([
          dashboardAPI.getLeadConversionSummary(requestParams),
          dashboardAPI.getLeadConversionFunnel(requestParams),
          dashboardAPI.getLeadConversionEmployees(employeeParams),
          dashboardAPI.getLeadConversionSources(requestParams),
          dashboardAPI.getLeadConversionActivities({ ...requestParams, limit: ACTIVITY_FETCH_LIMIT }),
          dashboardAPI.getLeadConversionTrend({ ...requestParams, granularity: trendGranularity }),
        ])

        if (!mounted || controller.signal.aborted) return
        setSummary(summaryRes)
        setFunnel(Array.isArray(funnelRes) ? funnelRes : [])
        setEmployees(Array.isArray(employeesRes) ? employeesRes : [])
        setSources(Array.isArray(sourcesRes) ? sourcesRes : [])
        setActivities(Array.isArray(activitiesRes) ? activitiesRes : [])
        setTrend(Array.isArray(trendRes) ? trendRes : [])
        setLastUpdated(new Date().toISOString())
      } catch (err) {
        if (!mounted || controller.signal.aborted) return
        setError(err?.message || 'Failed to load lead conversion dashboard')
      } finally {
        if (mounted && !controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()
    const id = window.setInterval(() => load({ silent: true }), 15 * 1000)

    return () => {
      mounted = false
      controller.abort()
      window.clearInterval(id)
    }
  }, [requestParams, sortBy, sortDir, trendGranularity, refreshTick])

  useEffect(() => {
    setActivityPage(0)
  }, [filter, startDate, endDate, employeeId, status])

  const employeeOptions = useMemo(() => {
    if (!isFullAccess) return []
    return employees.map((row) => ({ value: row.employeeId, label: row.employeeName }))
  }, [employees, isFullAccess])

  const funnelData = useMemo(() => {
    const sorted = [...funnel].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    const maxCount = Math.max(1, ...sorted.map((row) => Number(row.count || 0)))
    const step = maxCount / Math.max(1, sorted.length)
    return sorted.map((row, index) => {
      const stageColor = STAGE_COLORS[row.key] || SOURCE_COLORS[index % SOURCE_COLORS.length]
      const realCount = Number(row.count || 0)
      const descendingMin = Math.max(1, Math.round(maxCount - step * index))
      return {
        ...row,
        displayCount: realCount > 0 ? Math.max(realCount, descendingMin) : descendingMin,
        color: stageColor,
        fill: stageColor,
        dropOffLabel: prettyPercent(row.dropOffPercent),
        conversionLabel: prettyPercent(row.conversionPercent),
      }
    })
  }, [funnel])

  const sourcePieData = useMemo(() => sources
    .filter((row) => Number(row.totalLeads || 0) > 0)
    .map((row, index) => ({
      name: row.sourceLabel,
      value: Number(row.totalLeads || 0),
      converted: Number(row.convertedLeads || 0),
      rate: Number(row.conversionRate || 0),
      color: SOURCE_COLORS[index % SOURCE_COLORS.length],
      bestPerforming: row.bestPerforming,
    })), [sources])

  const statusDonutData = useMemo(() => (summary?.statusBreakdown || []).map((row) => ({
    name: row.label,
    value: Number(row.count || 0),
    key: row.key,
    color: STAGE_COLORS[row.key] || '#8b5cf6',
  })), [summary])

  const bestSource = useMemo(() => sources.find((row) => row.bestPerforming) || null, [sources])

  const trendHasData = useMemo(() => trend.some((row) =>
    Number(row.leadCount || 0) > 0 || Number(row.convertedCount || 0) > 0 || Number(row.revenueGenerated || 0) > 0
  ), [trend])

  const kpiSparklines = useMemo(() => {
    const series = {}
    const rows = Array.isArray(trend) ? trend : []
    for (const item of KPI_CARDS) {
      const accessor = SPARKLINE_ACCESSORS[item.key] || (() => 0)
      series[item.key] = rows.map((row) => ({
        label: row.label || row.bucketKey,
        value: Number(accessor(row) || 0),
      }))
    }
    return series
  }, [trend])

  const activityTotalPages = Math.max(1, Math.ceil(activities.length / ACTIVITY_PAGE_SIZE))
  const boundedActivityPage = Math.min(activityPage, activityTotalPages - 1)
  const pagedActivities = activities.slice(
    boundedActivityPage * ACTIVITY_PAGE_SIZE,
    boundedActivityPage * ACTIVITY_PAGE_SIZE + ACTIVITY_PAGE_SIZE
  )

  const onSort = (key) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir(key === 'pending' ? 'asc' : 'desc')
      return key
    })
  }

  return (
    <section className="space-y-2.5 sm:space-y-3">
      {/* ── Compact filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div ref={dateFilterRef} className="relative">
          <button
            type="button"
            onClick={() => setDateMenuOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 backdrop-blur-sm transition-colors hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/80"
          >
            <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
            <span>{DATE_FILTERS.find((option) => option.value === filter)?.label || 'This Month'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {dateMenuOpen && (
            <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950">
              {DATE_FILTERS.map((option) => {
                const active = option.value === filter
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFilter(option.value)
                      setDateMenuOpen(false)
                    }}
                    className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/70'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {isFullAccess && (
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200"
          >
            <option value="">All Employees</option>
            {employeeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {filter === 'custom' && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm dark:border-slate-700/60 dark:bg-slate-900/60"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm dark:border-slate-700/60 dark:bg-slate-900/60"
            />
          </>
        )}

        <button
          type="button"
          onClick={() => setRefreshTick((tick) => tick + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 backdrop-blur-sm transition-colors hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:text-emerald-300"
          title={lastUpdated ? `Last refreshed ${formatActivityTime(lastUpdated)}` : 'Refresh live KPI data'}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
          Live 15s
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => <LoadingCard key={index} />)}
        </div>
      )}

      {!loading && (
        <>
          {/* ── KPI Cards — all live tiles, 6 + 6 on desktop ── */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {KPI_CARDS.map((item) => (
              <MetricCard key={item.key} item={item} metric={summary?.[item.key]} sparkline={kpiSparklines[item.key]} />
            ))}
          </div>

          {/* ── Funnel + Trend ── */}
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
            <div className="glass-card p-3 sm:p-4 xl:col-span-5">
              <SectionShell
                title="Lead Conversion Funnel"
                icon={Target}
                subtitle="Stage progression with drop-off."
                action={bestSource ? <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300">Best: {bestSource.sourceLabel}</span> : null}
              />
              {funnelData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <FunnelChart margin={{ right: 110, top: 4, bottom: 4 }}>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const stage = payload[0].payload
                        return (
                          <div className="glass-card px-4 py-3 text-sm shadow-xl">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{stage.label}</p>
                            <p className="mt-1 text-slate-600 dark:text-slate-400">Count: <span className="font-semibold text-slate-800 dark:text-slate-200">{prettyNumber(stage.count)}</span></p>
                            <p className="text-slate-600 dark:text-slate-400">Drop-off: <span className="font-semibold text-slate-800 dark:text-slate-200">{stage.dropOffLabel}</span></p>
                            <p className="text-slate-600 dark:text-slate-400">Conversion: <span className="font-semibold text-slate-800 dark:text-slate-200">{stage.conversionLabel}</span></p>
                          </div>
                        )
                      }}
                    />
                    <Funnel dataKey="displayCount" data={funnelData} isAnimationActive>
                      <LabelList position="right" fill="#475569" stroke="none" content={({ x, y, width, height, index }) => {
                        const item = funnelData[index]
                        if (!item) return null
                        const labelX = x + width + 10
                        const centerY = y + height / 2 + 1
                        const count = Number(item.count || 0)
                        return (
                          <text x={labelX} y={centerY} dominantBaseline="central" fontSize={12}>
                            <tspan fill="#334155" fontWeight={600}>{item.label}</tspan>
                            <tspan fill="#94a3b8" fontWeight={400}>{` · ${count}`}</tspan>
                          </text>
                        )
                      }} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmptyState label="No funnel data available." />
              )}
            </div>

            <div className="glass-card p-3 sm:p-4 xl:col-span-7">
              <SectionShell
                title="Trend Line"
                icon={LineChartIcon}
                subtitle="Leads, conversions, and revenue over time."
              />
              {trend.length && trendHasData ? (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="glass-card px-4 py-3 text-sm shadow-xl">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                            {payload.map((entry) => (
                              <p key={entry.dataKey} style={{ color: entry.color }}>
                                {entry.name}: <span className="font-semibold">{entry.dataKey === 'revenueGenerated' ? prettyCurrency(entry.value) : prettyNumber(entry.value)}</span>
                              </p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="leadCount" name="Leads" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="convertedCount" name="Converted" stroke="#10b981" strokeWidth={2.5} dot={false} />
                    <Area yAxisId="right" type="monotone" dataKey="revenueGenerated" name="Revenue" stroke="#f59e0b" fill="rgba(245,158,11,0.18)" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[240px] flex-col items-center justify-center text-center">
                  <LineChartIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Not enough data for trends yet</p>
                  <p className="text-xs text-slate-400">Trends will appear as leads flow in over multiple days.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* ── #2: Lead Source Analytics ── */}
            <div className="glass-card p-3 sm:p-4">
              <SectionShell
                title="Lead Source Analytics"
                icon={Globe2}
                subtitle="Conversion rates and revenue by source."
              />
              {sourcePieData.length > 1 ? (
                <div className="flex items-center gap-4">
                  <div className="w-[160px] shrink-0">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={sourcePieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={2} strokeWidth={0}>
                          {sourcePieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div className="glass-card px-3 py-2 text-xs shadow-xl">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{d.name}</p>
                                <p className="text-slate-500">{prettyNumber(d.value)} leads · {prettyPercent(d.rate)} conv.</p>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {sourcePieData.map((row) => {
                      const total = sourcePieData.reduce((sum, r) => sum + r.value, 0)
                      const share = total > 0 ? (row.value / total) * 100 : 0
                      return (
                        <div key={row.name} className="flex items-center gap-2 text-xs">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                          <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300">{row.name}</span>
                          <span className="tabular-nums text-slate-500">{prettyNumber(row.value)}</span>
                          <span className="w-[42px] text-right tabular-nums text-slate-400">{prettyPercent(share)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : sourcePieData.length === 1 ? (
                <div className="flex items-center gap-5 py-3">
                  <div className="flex h-[80px] w-[80px] shrink-0 items-center justify-center rounded-full" style={{ background: `${sourcePieData[0].color}14`, border: `3px solid ${sourcePieData[0].color}` }}>
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{prettyNumber(sourcePieData[0].value)}</p>
                      <p className="text-[10px] text-slate-400">leads</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sourcePieData[0].name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Only active source · {prettyPercent(sourcePieData[0].rate)} conversion</p>
                    {sourcePieData[0].converted > 0 && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{prettyNumber(sourcePieData[0].converted)} converted</p>
                    )}
                  </div>
                </div>
              ) : (
                <ChartEmptyState label="No source analytics available." />
              )}
            </div>

            {/* ── #3: Status Donut ── */}
            <div className="glass-card p-3 sm:p-4">
              <SectionShell
                title="Status Donut"
                icon={Repeat2}
                subtitle="Current pipeline balance by status."
              />
              {(() => {
                const activeStatuses = statusDonutData.filter((row) => row.value > 0)
                const totalStatusLeads = activeStatuses.reduce((sum, r) => sum + r.value, 0)
                if (!activeStatuses.length) return <ChartEmptyState label="No status data available." />
                return (
                  <div className="flex items-center gap-4">
                    <div className="w-[140px] shrink-0">
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={activeStatuses} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={55} paddingAngle={2} strokeWidth={0}>
                            {activeStatuses.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const d = payload[0].payload
                              return (
                                <div className="glass-card px-3 py-2 text-xs shadow-xl">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200">{d.name}</p>
                                  <p className="text-slate-500">{prettyNumber(d.value)} leads</p>
                                </div>
                              )
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {activeStatuses.map((row) => {
                        const share = totalStatusLeads > 0 ? (row.value / totalStatusLeads) * 100 : 0
                        return (
                          <div key={row.key} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                            <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300">{row.name}</span>
                            <span className="tabular-nums text-slate-500">{prettyNumber(row.value)}</span>
                            <span className="w-[42px] text-right tabular-nums text-slate-400">{prettyPercent(share)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ── #4: Activity Timeline — compact grid ── */}
          <div className="glass-card p-3 sm:p-4">
            <SectionShell
              title="Lead Activity Timeline"
              icon={CalendarDays}
              subtitle="Latest lifecycle events."
              action={activities.length > ACTIVITY_PAGE_SIZE ? (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="hidden text-slate-400 sm:inline">
                    {boundedActivityPage + 1}/{activityTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivityPage((page) => Math.max(0, page - 1))}
                    disabled={boundedActivityPage === 0}
                    aria-label="Previous activities"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/50 bg-white/45 text-slate-500 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/50 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityPage((page) => Math.min(activityTotalPages - 1, page + 1))}
                    disabled={boundedActivityPage >= activityTotalPages - 1}
                    aria-label="Next activities"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/50 bg-white/45 text-slate-500 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/50 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            />
            {activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                <CalendarDays className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">No recent activities</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Activities will appear here as leads move through the pipeline.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pagedActivities.map((item) => {
                  const stageColor = STAGE_COLORS[item.newStatus] || '#7c3aed'
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      style={{
                        background: 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.35)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stageColor }} />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">{item.leadName || 'Unnamed lead'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] mb-1">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.oldStatus || '—'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="rounded px-1.5 py-0.5 font-medium" style={{ backgroundColor: `${stageColor}14`, color: stageColor }}>{item.newStatus || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{item.employeeName || 'Unassigned'}</span>
                        <span>{formatActivityTime(item.occurredAt)}</span>
                      </div>
                      {item.notes && <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">{item.notes}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── #5: Employee Performance — compact leaderboard ── */}
          <div className="glass-card p-3 sm:p-4">
            <SectionShell
              title="Employee Performance"
              icon={Users}
              subtitle="Click a row to expand details."
              action={(
                <div className="flex items-center gap-1.5">
                  {[['conversion', 'Conv.'], ['pending', 'Pending'], ['revenue', 'Revenue']].map(([key, label]) => (
                    <button key={key} type="button" onClick={() => onSort(key)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${sortBy === key ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >{label}</button>
                  ))}
                </div>
              )}
            />

            {employees.length ? (
              <div className="space-y-1.5">
                {employees.slice(0, 8).map((row, idx) => {
                  const isExpanded = expandedEmployee === row.employeeId
                  const maxAssigned = Math.max(1, ...employees.slice(0, 8).map((e) => Number(e.assignedLeads || 0)))
                  const barWidth = Math.max(4, (Number(row.assignedLeads || 0) / maxAssigned) * 100)
                  return (
                    <div key={row.employeeId}>
                      <button
                        type="button"
                        onClick={() => setExpandedEmployee(isExpanded ? null : row.employeeId)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{row.employeeName}</p>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${barWidth}%` }} />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                          <span className="text-slate-600 dark:text-slate-400">{prettyNumber(row.assignedLeads)} assigned</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{prettyPercent(row.conversionRate)}</span>
                        </div>
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mx-3 mb-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50/80 px-4 py-3 text-xs dark:bg-slate-800/40 sm:grid-cols-4">
                              {[
                                ['Contacted', row.contactedLeads, ''],
                                ['Converted', row.convertedLeads, 'text-emerald-600 dark:text-emerald-400'],
                                ['Lost', row.lostLeads, 'text-rose-600 dark:text-rose-400'],
                                ['Pending', row.pendingLeads, 'text-amber-600 dark:text-amber-400'],
                                ['Follow-ups', row.followUpsDone, ''],
                                ['Resp. Time', `${prettyNumber(row.averageResponseMinutes)} min`, ''],
                                ['Revenue', prettyCurrency(row.revenueGenerated), 'font-semibold'],
                                ['Conv. Rate', prettyPercent(row.conversionRate), 'font-semibold'],
                              ].map(([label, val, cls]) => (
                                <div key={label} className="flex items-center justify-between py-0.5">
                                  <span className="text-slate-500">{label}</span>
                                  <span className={`font-medium text-slate-700 dark:text-slate-300 ${cls}`}>{typeof val === 'number' ? prettyNumber(val) : val}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            ) : (
              <ChartEmptyState label="No employee data yet." />
            )}
          </div>
        </>
      )}
    </section>
  )
}
