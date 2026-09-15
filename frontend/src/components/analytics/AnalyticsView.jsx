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

const PDF_COLORS = {
  navy: [15, 23, 42],
  slate: [71, 85, 105],
  muted: [100, 116, 139],
  line: [226, 232, 240],
  soft: [248, 250, 252],
  blue: [14, 165, 233],
  cyan: [6, 182, 212],
  emerald: [16, 185, 129],
  amber: [245, 158, 11],
  rose: [244, 63, 94],
  violet: [124, 58, 237],
  white: [255, 255, 255],
}

const pdfHexToRgb = (hex, fallback = PDF_COLORS.blue) => {
  const value = String(hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return fallback
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

const pdfText = (doc, text, x, y, { size = 9, color = PDF_COLORS.slate, style = 'normal', maxWidth } = {}) => {
  doc.setFont('helvetica', style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
  const lines = maxWidth ? doc.splitTextToSize(String(text ?? ''), maxWidth) : String(text ?? '')
  doc.text(lines, x, y)
  return Array.isArray(lines) ? lines.length : 1
}

const pdfCard = (doc, x, y, width, height, fill = PDF_COLORS.white, border = PDF_COLORS.line) => {
  doc.setFillColor(...fill)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.25)
  doc.roundedRect(x, y, width, height, 3, 3, 'FD')
}

const pdfSectionTitle = (doc, title, subtitle, y) => {
  pdfText(doc, title, 14, y, { size: 14, color: PDF_COLORS.navy, style: 'bold' })
  if (subtitle) pdfText(doc, subtitle, 14, y + 6, { size: 8, color: PDF_COLORS.muted })
  return y + 14
}

const pdfTable = (doc, startY, head, body, options = {}) => {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'grid',
    margin: { left: 14, right: 14, bottom: 18 },
    styles: {
      font: 'helvetica',
      fontSize: options.fontSize || 7.4,
      cellPadding: options.cellPadding || 2.4,
      textColor: PDF_COLORS.slate,
      lineColor: PDF_COLORS.line,
      lineWidth: 0.18,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: options.headColor || PDF_COLORS.navy,
      textColor: PDF_COLORS.white,
      fontStyle: 'bold',
      fontSize: options.headFontSize || 7.5,
      cellPadding: 2.8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: options.columnStyles || {},
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index % 2 === 1) {
        hookData.cell.styles.fillColor = [251, 253, 255]
      }
      if (options.didParseCell) options.didParseCell(hookData)
    },
    didDrawCell: options.didDrawCell,
    showHead: 'everyPage',
  })
  return doc.lastAutoTable?.finalY || startY
}

const pdfFooter = (doc, report, page, totalPages) => {
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...PDF_COLORS.line)
  doc.setLineWidth(0.3)
  doc.line(14, height - 13, width - 14, height - 13)
  pdfText(doc, 'NexaCRM  |  Lead Performance Intelligence', 14, height - 7, { size: 7, color: PDF_COLORS.muted, style: 'bold' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(`${report.summary.periodLabel || 'Selected period'}  |  Page ${page} of ${totalPages}`, width - 14, height - 7, { align: 'right' })
}

const pdfPageHeader = (doc, title, subtitle) => {
  const width = doc.internal.pageSize.getWidth()
  doc.setFillColor(...PDF_COLORS.navy)
  doc.rect(0, 0, width, 22, 'F')
  pdfText(doc, title, 14, 10, { size: 12, color: PDF_COLORS.white, style: 'bold' })
  pdfText(doc, subtitle, 14, 16, { size: 7.5, color: [203, 213, 225] })
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
    return { summary, total, converted, lost, active, assigned, pending, funnel, largestQueue, sourceRows, weakestSource, bestSource, actions, activities: data.activities }
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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const period = report.summary.periodLabel || 'Selected period'
    const revenue = valueOf(report.summary, 'revenueFromConvertedLeads')
    const totalLeads = report.total || 0
    const addPage = (title, subtitle) => {
      doc.addPage()
      pdfPageHeader(doc, title, subtitle)
      return 32
    }

    // Cover page: high-contrast executive summary with visual KPI cards.
    doc.setFillColor(...PDF_COLORS.navy)
    doc.rect(0, 0, pageWidth, 61, 'F')
    doc.setFillColor(...PDF_COLORS.blue)
    doc.circle(pageWidth - 24, 18, 36, 'F')
    doc.setFillColor(...PDF_COLORS.cyan)
    doc.circle(pageWidth - 4, 52, 23, 'F')
    pdfText(doc, 'NexaCRM', 16, 15, { size: 10, color: [125, 211, 252], style: 'bold' })
    pdfText(doc, 'Lead Performance', 16, 31, { size: 25, color: PDF_COLORS.white, style: 'bold' })
    pdfText(doc, 'Intelligence report', 16, 43, { size: 16, color: [186, 230, 253], style: 'normal' })
    pdfText(doc, `${period}  |  Current status snapshot`, 16, 53, { size: 8.5, color: [226, 232, 240] })
    doc.setFillColor(...PDF_COLORS.white)
    doc.roundedRect(pageWidth - 69, 12, 52, 13, 6, 6, 'F')
    pdfText(doc, new Date().toLocaleDateString('en-IN'), pageWidth - 43, 20.5, { size: 8, color: PDF_COLORS.navy, style: 'bold' })

    const cardY = 73
    const cardGap = 5
    const cardWidth = (pageWidth - 28 - cardGap * 3) / 4
    const cards = [
      ['LEADS CREATED', formatNumber(totalLeads), 'Selected-period volume', PDF_COLORS.blue],
      ['ACTIVE PIPELINE', formatNumber(report.active), 'Not won or lost', PDF_COLORS.violet],
      ['CURRENT WIN RATE', formatPercent(totalLeads ? report.converted * 100 / totalLeads : 0), `${formatNumber(report.converted)} currently converted`, PDF_COLORS.emerald],
      ['REVENUE', formatCurrency(revenue), 'From converted leads', PDF_COLORS.amber],
    ]
    cards.forEach(([label, value, detail, color], index) => {
      const x = 14 + index * (cardWidth + cardGap)
      pdfCard(doc, x, cardY, cardWidth, 31, PDF_COLORS.white)
      doc.setFillColor(...color)
      doc.roundedRect(x, cardY, 2.2, 31, 1.1, 1.1, 'F')
      pdfText(doc, label, x + 7, cardY + 8, { size: 7, color: PDF_COLORS.muted, style: 'bold' })
      pdfText(doc, value, x + 7, cardY + 19, { size: 17, color: PDF_COLORS.navy, style: 'bold', maxWidth: cardWidth - 12 })
      pdfText(doc, detail, x + 7, cardY + 26, { size: 7.2, color: PDF_COLORS.muted, maxWidth: cardWidth - 12 })
    })

    let y = 108
    pdfText(doc, 'Executive reading', 14, y, { size: 13, color: PDF_COLORS.navy, style: 'bold' })
    pdfText(doc, 'The fastest way to improve is to focus the team on the largest live queue and the highest-value follow-ups.', 14, y + 6, { size: 8, color: PDF_COLORS.muted, maxWidth: 170 })
    y += 13
    const actionWidth = (pageWidth - 33) / 2
    report.actions.forEach((action, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = 14 + column * (actionWidth + 5)
      const boxY = y + row * 25
      const color = action.tone === 'rose' ? PDF_COLORS.rose : action.tone === 'amber' ? PDF_COLORS.amber : action.tone === 'violet' ? PDF_COLORS.violet : action.tone === 'sky' ? PDF_COLORS.blue : PDF_COLORS.emerald
      pdfCard(doc, x, boxY, actionWidth, 20, [250, 252, 255], [226, 232, 240])
      doc.setFillColor(...color)
      doc.circle(x + 8, boxY + 8, 3, 'F')
      pdfText(doc, `${index + 1}. ${action.title}`, x + 15, boxY + 7, { size: 8, color: PDF_COLORS.navy, style: 'bold', maxWidth: actionWidth - 20 })
      pdfText(doc, action.body, x + 15, boxY + 13, { size: 6.8, color: PDF_COLORS.muted, maxWidth: actionWidth - 20 })
    })

    y += 52
    pdfCard(doc, 14, y, pageWidth - 28, 19, [239, 246, 255], [186, 230, 253])
    pdfText(doc, 'Data definition', 21, y + 8, { size: 8, color: PDF_COLORS.blue, style: 'bold' })
    pdfText(doc, 'Each lead is counted once by its current status. Current win rate is an operational ratio, not a historical cohort conversion rate.', 21, y + 14, { size: 7.5, color: PDF_COLORS.slate, maxWidth: pageWidth - 48 })

    // Pipeline and trend detail.
    y = addPage('Pipeline and trend', 'Current portfolio distribution and period movement')
    y = pdfSectionTitle(doc, 'Pipeline distribution', 'Each lead appears once in its current stage. Percentages are portfolio share.', y)
    y = pdfTable(doc, y, [['Stage', 'Leads', 'Share', 'Interpretation']], report.funnel.map((row) => [
      row.label,
      formatNumber(row.count),
      formatPercent(totalLeads ? row.count * 100 / totalLeads : 0),
      ['CONVERTED', 'LOST'].includes(row.key) ? 'Final current outcome' : row.count === report.largestQueue?.count ? 'Largest active queue - review next action' : 'Active working stage',
    ]), {
      headColor: PDF_COLORS.violet,
      columnStyles: { 0: { cellWidth: 47 }, 1: { cellWidth: 24, halign: 'right' }, 2: { cellWidth: 24, halign: 'right' }, 3: { cellWidth: 140 } },
      didDrawCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          const row = report.funnel[hookData.row.index]
          if (row) {
            doc.setFillColor(...pdfHexToRgb(row.color))
            doc.circle(hookData.cell.x + 3.5, hookData.cell.y + hookData.cell.height / 2, 1.5, 'F')
          }
        }
      },
    })
    y += 10
    y = pdfSectionTitle(doc, 'Volume and outcomes over time', 'Created volume versus outcomes recorded in the selected period.', y)
    y = pdfTable(doc, y, [['Period', 'Created', 'New', 'Assigned', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost', 'Pending', 'Revenue']], data.trend.map((row) => [
      row.label || row.bucketKey,
      formatNumber(row.leadCount), formatNumber(row.newCount), formatNumber(row.assignedCount), formatNumber(row.contactedCount),
      formatNumber(row.qualifiedCount), formatNumber(row.proposalSentCount), formatNumber(row.convertedCount), formatNumber(row.lostCount),
      formatNumber(row.pendingFollowUpsCount), formatCurrency(row.revenueGenerated),
    ]), { fontSize: 6.2, headFontSize: 6.3, cellPadding: 1.8, headColor: PDF_COLORS.navy })

    // Source performance.
    y = addPage('Source performance', 'Where lead volume is coming from and how current outcomes compare')
    y = pdfSectionTitle(doc, 'Source performance table', 'Use volume and outcome quality together before increasing spend or campaign volume.', y)
    y = pdfTable(doc, y, [['Source', 'Leads', 'Converted', 'Lost', 'Current win rate', 'Revenue', 'Action']], report.sourceRows.map((row) => [
      row.sourceLabel,
      formatNumber(row.totalLeads),
      formatNumber(row.convertedLeads),
      formatNumber(row.lostLeads),
      formatPercent(row.conversionRate),
      formatCurrency(row.revenueGenerated),
      row.bestPerforming ? 'Protect quality and test more volume.' : row.totalLeads >= 3 && row.conversionRate === 0 ? 'Audit targeting and hand-off.' : 'Keep measuring before changing spend.',
    ]), { headColor: PDF_COLORS.emerald, fontSize: 7, columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 18, halign: 'right' }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 18, halign: 'right' }, 4: { cellWidth: 27, halign: 'right' }, 5: { cellWidth: 27, halign: 'right' }, 6: { cellWidth: 117 } } })
    y += 10
    pdfCard(doc, 14, y, pageWidth - 28, 27, [240, 253, 250], [167, 243, 208])
    pdfText(doc, report.bestSource ? `Best current source: ${report.bestSource.sourceLabel}` : 'Source quality signal', 21, y + 9, { size: 9, color: PDF_COLORS.emerald, style: 'bold' })
    pdfText(doc, report.bestSource ? `${formatNumber(report.bestSource.totalLeads)} leads · ${formatPercent(report.bestSource.conversionRate)} current win rate · ${formatCurrency(report.bestSource.revenueGenerated)} revenue` : 'No converted source is available in this period yet.', 21, y + 17, { size: 8, color: PDF_COLORS.slate })

    // Owner performance and all currently loaded activity rows.
    y = addPage('Owner execution and activity', 'Workload, outcomes, and recorded lifecycle signals')
    y = pdfSectionTitle(doc, 'Owner performance', 'Use this section to balance workload and coach execution.', y)
    y = pdfTable(doc, y, [['Owner', 'Assigned', 'Contacted', 'Converted', 'Lost', 'Pending', 'Win rate', 'Revenue']], data.employees.filter((row) => row.assignedLeads > 0).map((row) => [
      row.employeeName, formatNumber(row.assignedLeads), formatNumber(row.contactedLeads), formatNumber(row.convertedLeads), formatNumber(row.lostLeads), formatNumber(row.pendingLeads), formatPercent(row.conversionRate), formatCurrency(row.revenueGenerated),
    ]), { headColor: PDF_COLORS.amber, fontSize: 7.1, columnStyles: { 0: { cellWidth: 54 }, 1: { cellWidth: 22, halign: 'right' }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 20, halign: 'right' }, 6: { cellWidth: 24, halign: 'right' }, 7: { cellWidth: 28, halign: 'right' } } })
    y += 10
    y = pdfSectionTitle(doc, 'Recorded lead activity', `${report.activities.length} activity signal(s) loaded for this report.`, y)
    pdfTable(doc, y, [['Lead', 'Activity', 'Transition', 'Owner', 'Source', 'When', 'Notes']], report.activities.map((activity) => [
      activity.leadName || 'Unnamed lead',
      activity.activityType || 'Activity',
      activity.oldStatus && activity.newStatus ? `${activity.oldStatus} -> ${activity.newStatus}` : '—',
      activity.employeeName || 'Unassigned',
      activity.source || '—',
      formatDateTime(activity.occurredAt),
      activity.notes || 'Lifecycle activity recorded',
    ]), { headColor: PDF_COLORS.rose, fontSize: 6.4, cellPadding: 1.8, columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 25 }, 2: { cellWidth: 37 }, 3: { cellWidth: 30 }, 4: { cellWidth: 25 }, 5: { cellWidth: 35 }, 6: { cellWidth: 83 } } })

    // Data notes appendix makes the report useful when it is shared outside the CRM.
    y = addPage('Recommendations and data notes', 'Definitions, limitations, and the next measurement improvements')
    y = pdfSectionTitle(doc, 'Recommended next actions', 'These recommendations are derived from the selected filters and current operational signals.', y)
    report.actions.forEach((action, index) => {
      const boxY = y + index * 25
      pdfCard(doc, 14, boxY, pageWidth - 28, 20, index % 2 ? [251, 253, 255] : [248, 250, 252], PDF_COLORS.line)
      pdfText(doc, `${index + 1}. ${action.title}`, 21, boxY + 8, { size: 8.5, color: PDF_COLORS.navy, style: 'bold' })
      pdfText(doc, action.body, 21, boxY + 14, { size: 7.3, color: PDF_COLORS.muted, maxWidth: pageWidth - 48 })
    })
    y += report.actions.length * 25 + 8
    y = pdfSectionTitle(doc, 'Data notes', 'What this report can and cannot prove today.', y)
    const notes = [
      ['Reliable now', 'Lead counts, current status, source, owner assignment, converted/lost counts, revenue, pending follow-ups, and recorded activities.'],
      ['Use carefully', 'Current win rate is based on leads created in the selected period and their current status. Recent leads may not have matured yet.'],
      ['Missing for precision', 'Complete stage transitions, first-response timestamps, and reason-coded losses are needed for true cohort conversion and time-to-convert analysis.'],
      ['Filter scope', `${period}${employeeId ? ' · selected owner' : ' · all owners'}${status ? ` · ${STATUS_FILTERS.find((item) => item.value === status)?.label || status}` : ' · all statuses'}.`],
    ]
    pdfTable(doc, y, [['Topic', 'Definition']], notes, { headColor: PDF_COLORS.navy, fontSize: 8, columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 208 } } })

    const totalPages = doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page)
      pdfFooter(doc, report, page, totalPages)
    }
    doc.save(`nexacrm-lead-performance-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success(`Lead performance PDF downloaded (${totalPages} pages).`)
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
