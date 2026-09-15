import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays,
  CheckCircle2, CircleHelp, Clock3, Database, Download, FileText, Filter,
  Gauge, Layers3, RefreshCw, ShieldCheck, Target, TrendingDown, TrendingUp,
  UserCheck, Users, XCircle,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import { dashboardAPI, analyticsAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { PERMISSIONS, hasPermission } from '../../utils/permissions'

const DATE_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom range' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL_SENT', label: 'Proposal sent' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
]

const STAGE_COLORS = {
  NEW: '#6366f1',
  ASSIGNED: '#8b5cf6',
  CONTACTED: '#0ea5e9',
  INTERESTED: '#14b8a6',
  QUALIFIED: '#10b981',
  PROPOSAL_SENT: '#f59e0b',
  CONVERTED: '#22c55e',
  LOST: '#f43f5e',
}

const SOURCE_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16']

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN')
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const valueOf = (summary, key) => Number(summary?.[key]?.value || 0)
const metricChange = (summary, key) => Number(summary?.[key]?.changePercent || 0)

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

const trendGranularity = (filter, startDate, endDate) => {
  if (filter !== 'custom') return filter === 'thisMonth' || filter === 'lastMonth' ? 'day' : 'day'
  if (!startDate || !endDate) return 'day'
  const days = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000))
  return days <= 31 ? 'day' : days <= 120 ? 'week' : 'month'
}

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function ChangePill({ value }) {
  const change = Number(value || 0)
  const positive = change >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
      {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {formatPercent(Math.abs(change))}
    </span>
  )
}

function MetricCard({ label, value, detail, icon: Icon, change, tone = 'brand', valueClass = '' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300',
  }
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className={`mt-2 truncate text-2xl font-bold text-slate-900 dark:text-slate-50 ${valueClass}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <div className={`rounded-xl p-2 ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
      {change !== undefined ? <div className="mt-3 flex items-center gap-2 border-t border-slate-200/70 pt-2.5 dark:border-slate-700/50"><ChangePill value={change} /><span className="text-[11px] text-slate-400">vs previous period</span></div> : null}
    </div>
  )
}

function EmptyState({ children }) {
  return <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{children}</div>
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user)
  const [filter, setFilter] = useState('thisMonth')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [data, setData] = useState({ summary: null, funnel: [], sources: [], employees: [], trend: [], activities: [] })

  const canExport = hasPermission(user, PERMISSIONS.REPORTS_EXPORT) || hasPermission(user, PERMISSIONS.ANALYTICS_EXPORT)
  const fullAccess = ['COMPANY_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role)
  const requestParams = useMemo(() => ({
    filter,
    ...(filter === 'custom' && startDate ? { startDate } : {}),
    ...(filter === 'custom' && endDate ? { endDate } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status } : {}),
  }), [employeeId, endDate, filter, startDate, status])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    const params = { ...requestParams }
    const calls = [
      dashboardAPI.getLeadConversionSummary(params),
      dashboardAPI.getLeadConversionFunnel(params),
      dashboardAPI.getLeadConversionSources(params),
      dashboardAPI.getLeadConversionEmployees({ ...params, sortBy: 'pending', sortDir: 'desc' }),
      dashboardAPI.getLeadConversionTrend({ ...params, granularity: trendGranularity(filter, startDate, endDate) }),
      dashboardAPI.getLeadConversionActivities({ ...params, limit: 40 }),
    ]

    Promise.allSettled(calls).then((results) => {
      if (!mounted) return
      const [summary, funnel, sources, employees, trend, activities] = results
      const rejected = results.find((result) => result.status === 'rejected')
      if (rejected) setError(rejected.reason?.message || 'Some analytics sections could not be loaded.')
      setData({
        summary: summary.status === 'fulfilled' ? summary.value : null,
        funnel: funnel.status === 'fulfilled' && Array.isArray(funnel.value) ? funnel.value : [],
        sources: sources.status === 'fulfilled' && Array.isArray(sources.value) ? sources.value : [],
        employees: employees.status === 'fulfilled' && Array.isArray(employees.value) ? employees.value : [],
        trend: trend.status === 'fulfilled' && Array.isArray(trend.value) ? trend.value : [],
        activities: activities.status === 'fulfilled' && Array.isArray(activities.value) ? activities.value : [],
      })
      setLastUpdated(new Date().toISOString())
    }).finally(() => {
      if (mounted) setLoading(false)
    })

    return () => { mounted = false }
  }, [filter, refreshTick, requestParams, startDate, endDate])

  const report = useMemo(() => {
    const summary = data.summary || {}
    const total = valueOf(summary, 'totalLeads')
    const converted = valueOf(summary, 'convertedLeads')
    const lost = valueOf(summary, 'lostLeads')
    const active = Math.max(0, total - converted - lost)
    const assigned = valueOf(summary, 'assignedLeads')
    const pending = valueOf(summary, 'pendingFollowUps')
    const funnel = (data.funnel.length ? data.funnel : (summary.statusBreakdown || [])).map((row, index) => ({
      ...row,
      key: row.key || row.stage || `stage-${index}`,
      label: row.label || row.stage || 'Unknown stage',
      count: Number(row.count || 0),
      color: STAGE_COLORS[row.key] || STAGE_COLORS[row.stage] || SOURCE_COLORS[index % SOURCE_COLORS.length],
    }))
    const activeRows = funnel.filter((row) => !['CONVERTED', 'LOST', 'WON'].includes(row.key))
    const largestQueue = activeRows.reduce((best, row) => row.count > (best?.count || 0) ? row : best, null)
    const sourceRows = data.sources.filter((row) => Number(row.totalLeads || 0) > 0)
    const weakestSource = sourceRows.filter((row) => row.totalLeads >= 3).sort((a, b) => a.conversionRate - b.conversionRate)[0]
    const bestSource = sourceRows.find((row) => row.bestPerforming) || sourceRows.slice().sort((a, b) => b.conversionRate - a.conversionRate)[0]
    const actions = [
      pending > 0
        ? { tone: 'amber', icon: Clock3, title: `Close ${formatNumber(pending)} pending follow-up${pending === 1 ? '' : 's'}`, body: 'A scheduled follow-up is the clearest near-term recovery action. Assign an owner and due time.' }
        : { tone: 'emerald', icon: CheckCircle2, title: 'Follow-up queue is clear', body: 'Keep the same discipline and make sure every new lead receives a next action.' },
      largestQueue?.count
        ? { tone: 'violet', icon: Layers3, title: `Review the ${largestQueue.label} queue`, body: `${formatNumber(largestQueue.count)} leads are currently here. Check ageing, owner capacity, and the next step for each one.` }
        : { tone: 'brand', icon: Target, title: 'Define a next-stage focus', body: 'Once leads arrive, use a clear qualification rule so the team knows which step to work next.' },
      weakestSource
        ? { tone: 'rose', icon: TrendingDown, title: `Audit ${weakestSource.sourceLabel}`, body: `${formatNumber(weakestSource.totalLeads)} leads have a ${formatPercent(weakestSource.conversionRate)} current win rate. Review campaign promise, audience, and hand-off quality.` }
        : { tone: 'brand', icon: Database, title: 'Capture source and campaign consistently', body: 'Reliable source attribution is needed before deciding where to increase or reduce spend.' },
      { tone: 'sky', icon: ShieldCheck, title: 'Add historical transition tracking', body: 'This report shows current status, not a proven cohort conversion rate. Record every stage change and first response timestamp for stronger decisions.' },
    ]
    return { summary, total, converted, lost, active, assigned, pending, funnel, largestQueue, sourceRows, weakestSource, bestSource, actions }
  }, [data])

  const employeeOptions = useMemo(() => data.employees
    .filter((row) => row.employeeId && row.employeeName)
    .map((row) => ({ value: row.employeeId, label: row.employeeName })), [data.employees])

  const statusMix = [
    { name: 'Active', value: report.active, color: '#0ea5e9' },
    { name: 'Converted', value: report.converted, color: '#22c55e' },
    { name: 'Lost', value: report.lost, color: '#f43f5e' },
  ].filter((item) => item.value > 0)

  const exportPdf = () => {
    if (!canExport) return toast.error('You do not have permission to export reports.')
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(17)
    doc.text('NexaCRM Lead Performance Report', 14, 16)
    doc.setFontSize(9)
    doc.text(`${report.summary.periodLabel || 'Selected period'} · Current status snapshot · Generated ${new Date().toLocaleString()}`, 14, 23)
    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Value', 'Definition']],
      body: [
        ['Total leads', formatNumber(report.total), 'Leads created in the selected period'],
        ['Active pipeline', formatNumber(report.active), 'Current status is neither converted nor lost'],
        ['Converted', formatNumber(report.converted), 'Currently marked converted/won'],
        ['Lost', formatNumber(report.lost), 'Currently marked lost'],
        ['Current win rate', formatPercent(report.total ? (report.converted * 100) / report.total : 0), 'Converted divided by selected-period leads'],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 165, 233] },
    })
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Stage', 'Leads', 'Share of selected leads']],
      body: report.funnel.map((row) => [row.label, formatNumber(row.count), formatPercent(report.total ? (row.count * 100) / report.total : 0)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    })
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Source', 'Leads', 'Won', 'Lost', 'Current win rate', 'Revenue']],
      body: report.sourceRows.map((row) => [row.sourceLabel, formatNumber(row.totalLeads), formatNumber(row.convertedLeads), formatNumber(row.lostLeads), formatPercent(row.conversionRate), formatCurrency(row.revenueGenerated)]),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [16, 185, 129] },
    })
    doc.save(`nexacrm-lead-performance-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('Lead performance PDF downloaded.')
  }

  const exportExcel = async () => {
    if (!canExport) return toast.error('You do not have permission to export reports.')
    setExporting('xlsx')
    try {
      const blob = await analyticsAPI.exportReport({ format: 'xlsx', scope: 'lead-funnel', ...requestParams })
      saveBlob(blob, `nexacrm-lead-performance-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Lead performance Excel report downloaded.')
    } catch (err) {
      toast.error(err?.message || 'Failed to download Excel report')
    } finally {
      setExporting('')
    }
  }

  if (loading && !data.summary) {
    return (
      <div className="space-y-4">
        <div className="glass-card h-36 animate-pulse bg-slate-100/70 dark:bg-slate-800/40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="glass-card h-32 animate-pulse bg-slate-100/70 dark:bg-slate-800/40" />)}</div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><div className="glass-card h-80 animate-pulse bg-slate-100/70 dark:bg-slate-800/40" /><div className="glass-card h-80 animate-pulse bg-slate-100/70 dark:bg-slate-800/40" /></div>
      </div>
    )
  }

  const winRate = report.total ? (report.converted * 100) / report.total : 0
  const assignedCoverage = report.total ? (report.assigned * 100) / report.total : 0
  return (
    <div className="space-y-5 pb-6">
      <div className="glass-card overflow-visible p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300"><BarChart3 className="h-4 w-4" /> Lead performance intelligence</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Know what is moving, what is stuck, and what to fix next.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">A decision-ready view of lead volume, current outcomes, source quality, team execution, and follow-up opportunities.</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {report.summary.periodLabel || 'Selected period'}</span><span>Updated {lastUpdated ? formatDateTime(lastUpdated) : '—'}</span></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRefreshTick((tick) => tick + 1)} className="btn-secondary gap-1.5 text-sm"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            <button type="button" onClick={exportPdf} disabled={!canExport} className="btn-secondary gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"><FileText className="h-4 w-4" /> PDF</button>
            <button type="button" onClick={exportExcel} disabled={!canExport || exporting === 'xlsx'} className="btn-primary gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /> {exporting === 'xlsx' ? 'Preparing...' : 'Excel'}</button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-700/50">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/50"><CalendarDays className="h-4 w-4 text-brand-500" /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200">{DATE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/50"><Filter className="h-4 w-4 text-slate-400" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200">{STATUS_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          {fullAccess ? <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/50"><Users className="h-4 w-4 text-slate-400" /><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="max-w-[180px] bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200"><option value="">All owners</option>{employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div> : null}
          {filter === 'custom' ? <><input aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm dark:border-slate-700/70 dark:bg-slate-900/50" /><input aria-label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm dark:border-slate-700/70 dark:bg-slate-900/50" /></> : null}
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400"><Gauge className="h-3.5 w-3.5" /> Counts are based on leads created in this period</span>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">{error} Refresh to retry the missing sections.</div> : null}
      {!canExport ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">You can view the report. Export downloads require report export permission.</div> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Leads created" value={formatNumber(report.total)} detail={report.summary.periodLabel || 'Selected period'} icon={Users} change={metricChange(report.summary, 'totalLeads')} tone="brand" />
        <MetricCard label="Active pipeline" value={formatNumber(report.active)} detail="Not converted or lost" icon={Layers3} change={metricChange(report.summary, 'totalLeads')} tone="violet" />
        <MetricCard label="Current win rate" value={formatPercent(winRate)} detail={`${formatNumber(report.converted)} currently converted`} icon={TrendingUp} change={metricChange(report.summary, 'conversionRate')} tone="emerald" />
        <MetricCard label="Assigned coverage" value={formatPercent(assignedCoverage)} detail={`${formatNumber(report.assigned)} leads have an owner`} icon={UserCheck} change={metricChange(report.summary, 'assignedLeads')} tone="amber" />
        <MetricCard label="Pending follow-ups" value={formatNumber(report.pending)} detail="Open follow-up dates" icon={Clock3} change={metricChange(report.summary, 'pendingFollowUps')} tone="rose" />
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900/60 dark:bg-sky-950/20 sm:p-5">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-white p-2 text-sky-600 shadow-sm dark:bg-sky-950/50 dark:text-sky-300"><CircleHelp className="h-5 w-5" /></div><div><p className="font-semibold text-sky-950 dark:text-sky-100">How to read this report accurately</p><p className="mt-1 text-sm leading-6 text-sky-800 dark:text-sky-200">Each lead is counted once by its current status. “Current win rate” is converted leads divided by leads created in the selected period; it is not a historical cohort conversion rate. Use it for operational direction, and add stage-change history before making investment or compensation decisions.</p></div></div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="glass-card p-4 sm:p-5 xl:col-span-7">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Current pipeline shape</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Where the selected-period leads sit right now.</p></div><span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{formatNumber(report.total)} leads</span></div>
          <div className="mt-5 space-y-3">
            {report.funnel.length ? report.funnel.map((row) => { const share = report.total ? (row.count * 100) / report.total : 0; return <div key={row.key}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium text-slate-700 dark:text-slate-200"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />{row.label}</span><span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{formatNumber(row.count)} <span className="ml-1 text-xs">({formatPercent(share)})</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, share)}%`, backgroundColor: row.color }} /></div></div> }) : <EmptyState>No lead stage data for this period.</EmptyState>}
          </div>
          <p className="mt-5 text-xs text-slate-400">The bars show portfolio share, not a sequential conversion funnel. Current stage counts can move up or down independently.</p>
        </section>

        <section className="glass-card p-4 sm:p-5 xl:col-span-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Outcome picture</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current outcome mix for leads created in the period.</p></div><Target className="h-5 w-5 text-emerald-500" /></div>
          {statusMix.length ? <div className="mt-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-[180px_1fr]"><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>{statusMix.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [formatNumber(value), 'Leads']} /></PieChart></ResponsiveContainer><div className="space-y-3">{statusMix.map((item) => <div key={item.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNumber(item.value)} <span className="ml-1 text-xs font-normal text-slate-400">({formatPercent(report.total ? item.value * 100 / report.total : 0)})</span></span></div>)}</div></div> : <EmptyState>No outcomes to chart for this period.</EmptyState>}
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/20"><p className="text-xs text-emerald-700 dark:text-emerald-300">Converted</p><p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-200">{formatNumber(report.converted)}</p></div><div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/20"><p className="text-xs text-rose-700 dark:text-rose-300">Lost</p><p className="mt-1 text-xl font-bold text-rose-800 dark:text-rose-200">{formatNumber(report.lost)}</p></div></div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="glass-card p-4 sm:p-5 xl:col-span-7"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Volume and outcomes over time</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Created lead volume compared with recorded converted and lost outcomes.</p></div><TrendingUp className="h-5 w-5 text-brand-500" /></div>{data.trend.length ? <div className="mt-4"><ResponsiveContainer width="100%" height={260}><AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="leadVolumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.28} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" /><XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip formatter={(value, name) => [formatNumber(value), name === 'leadCount' ? 'Created' : name === 'convertedCount' ? 'Converted' : 'Lost']} /><Area type="monotone" dataKey="leadCount" name="leadCount" stroke="#0ea5e9" fill="url(#leadVolumeFill)" strokeWidth={2} /><Area type="monotone" dataKey="convertedCount" name="convertedCount" stroke="#22c55e" fill="none" strokeWidth={2} /><Area type="monotone" dataKey="lostCount" name="lostCount" stroke="#f43f5e" fill="none" strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <div className="mt-4"><EmptyState>No trend data for this period.</EmptyState></div>}</section>
        <section className="glass-card p-4 sm:p-5 xl:col-span-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Where to improve</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Priorities generated from the visible operational signals.</p></div><AlertTriangle className="h-5 w-5 text-amber-500" /></div><div className="mt-4 space-y-3">{report.actions.map((action) => { const Icon = action.icon; const tone = { amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-300', violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/25 dark:text-violet-300', rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/25 dark:text-rose-300', sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/25 dark:text-sky-300', emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-300', brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950/25 dark:text-brand-300' }[action.tone]; return <div key={action.title} className="flex gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60"><div className={`mt-0.5 rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{action.title}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{action.body}</p></div></div> })}</div><Link to="/leads" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">Open leads to act on these signals <ArrowUpRight className="h-4 w-4" /></Link></section>
      </div>

      <section className="glass-card overflow-hidden"><div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-700/50 sm:px-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Source performance</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Compare volume, current outcomes, and revenue before scaling a source.</p></div><BarChart3 className="h-5 w-5 text-brand-500" /></div></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700"><thead className="bg-slate-50/70 dark:bg-slate-900/50"><tr>{['Source', 'Leads', 'Converted', 'Lost', 'Current win rate', 'Revenue', 'Read'].map((header) => <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{report.sourceRows.length ? report.sourceRows.map((row, index) => <tr key={row.sourceKey || row.sourceLabel} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40"><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 dark:text-slate-200"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} />{row.sourceLabel}{row.bestPerforming ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Best rate</span> : null}</td><td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(row.totalLeads)}</td><td className="px-4 py-3 tabular-nums text-emerald-600">{formatNumber(row.convertedLeads)}</td><td className="px-4 py-3 tabular-nums text-rose-500">{formatNumber(row.lostLeads)}</td><td className="px-4 py-3 font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatPercent(row.conversionRate)}</td><td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(row.revenueGenerated)}</td><td className="max-w-xs px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{row.bestPerforming ? 'Protect quality and test more volume.' : row.totalLeads >= 3 && row.conversionRate === 0 ? 'Audit targeting and hand-off.' : 'Keep measuring before changing spend.'}</td></tr>) : <tr><td colSpan="7" className="px-4 py-8"><EmptyState>No source data for this period.</EmptyState></td></tr>}</tbody></table></div></section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="glass-card overflow-hidden"><div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-700/50"><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Owner execution</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use this to balance workload and coach follow-up quality.</p></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700"><thead className="bg-slate-50/70 dark:bg-slate-900/50"><tr>{['Owner', 'Assigned', 'Contacted', 'Won', 'Pending', 'Win rate'].map((header) => <th key={header} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.employees.filter((row) => row.assignedLeads > 0).map((row) => <tr key={row.employeeId || row.employeeName}><td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.employeeName}</td><td className="px-3 py-3 tabular-nums">{formatNumber(row.assignedLeads)}</td><td className="px-3 py-3 tabular-nums">{formatNumber(row.contactedLeads)}</td><td className="px-3 py-3 tabular-nums text-emerald-600">{formatNumber(row.convertedLeads)}</td><td className="px-3 py-3 tabular-nums text-amber-600">{formatNumber(row.pendingLeads)}</td><td className="px-3 py-3 font-semibold tabular-nums">{formatPercent(row.conversionRate)}</td></tr>)}{!data.employees.some((row) => row.assignedLeads > 0) ? <tr><td colSpan="6" className="px-3 py-8"><EmptyState>No assigned-owner data for this period.</EmptyState></td></tr> : null}</tbody></table></div></section>

        <section className="glass-card overflow-hidden"><div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-700/50"><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recorded lead activity</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recent lifecycle signals available for the selected period.</p></div><div className="max-h-[360px] overflow-y-auto">{data.activities.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{data.activities.slice(0, 12).map((activity) => <div key={activity.id} className="flex gap-3 px-4 py-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{activity.leadName || 'Unnamed lead'} <span className="font-normal text-slate-400">· {activity.activityType || 'Activity'}</span></p><time className="text-[11px] text-slate-400">{formatDateTime(activity.occurredAt)}</time></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activity.oldStatus && activity.newStatus ? `${activity.oldStatus} → ${activity.newStatus}` : activity.notes || 'Lifecycle activity recorded'}{activity.employeeName ? ` · ${activity.employeeName}` : ''}</p></div></div>)}</div> : <div className="p-4"><EmptyState>No recorded activity signals for this period.</EmptyState></div>}</div></section>
      </div>

      <section className="glass-card p-4 sm:p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Data confidence and next measurement</h2><div className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><p className="text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-100">Reliable now:</strong> total, current status, source, owner, converted, lost, revenue, and follow-up counts.</p></div><div className="flex gap-2"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><p className="text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-100">Use carefully:</strong> current win rate depends on the selected creation period and can change as leads mature.</p></div><div className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /><p className="text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-100">Missing for precision:</strong> complete stage transitions, response-time samples, and reason-coded losses.</p></div></div></div></div></section>
    </div>
  )
}
