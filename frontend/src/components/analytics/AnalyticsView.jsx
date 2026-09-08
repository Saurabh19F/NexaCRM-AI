import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, Cell, CartesianGrid, Funnel, FunnelChart, LabelList,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, ArrowDownRight, BadgeCheck, Download, FileText,
  Filter, Layers3, Target, TrendingDown, Users,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import { analyticsAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { PERMISSIONS, hasPermission } from '../../utils/permissions'

const FALLBACK_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b']

const formatNumber = (value) => Number(value || 0).toLocaleString()
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

const stageNarrative = (row, index, rows) => {
  if (!row.count) return 'No leads are currently parked here; keep monitoring imports and hand-offs into this step.'
  if (index === 0) return 'This is the intake pool. A high count here means new leads need quick qualification and ownership.'
  if (String(row.stage).toLowerCase().includes('lost')) return 'Lost leads should be reviewed for reason patterns, source quality, and follow-up timing.'
  if (String(row.stage).toLowerCase().includes('converted')) return 'Converted leads show completed movement through the funnel and should be compared with source and owner quality.'

  const previous = rows[index - 1]
  if (previous && previous.count > 0 && row.count < previous.count * 0.5) {
    return 'This stage receives much less volume than the previous step, so the transition deserves close review.'
  }
  return 'This stage has active volume and should be checked for aging, owner workload, and next action discipline.'
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const [error, setError] = useState('')
  const [widgets, setWidgets] = useState(null)
  const user = useAuthStore((state) => state.user)
  const canExport = hasPermission(user, PERMISSIONS.REPORTS_EXPORT) || hasPermission(user, PERMISSIONS.ANALYTICS_EXPORT)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const widgetData = await analyticsAPI.getDashboardWidgets()
        if (cancelled) return
        setWidgets(widgetData || {})
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load lead funnel report')
          toast.error(err?.message || 'Failed to load lead funnel report')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const report = useMemo(() => {
    const rawStages = Array.isArray(widgets?.funnelData) ? widgets.funnelData : []
    const sla = widgets?.slaSummary || {}
    const aging = widgets?.agingCounts || {}
    const totalFromStages = rawStages.reduce((sum, stage) => sum + Number(stage.count || 0), 0)
    const totalLeads = Number(sla.total ?? totalFromStages)
    const activeTotal = totalLeads || totalFromStages || 1
    const maxCount = Math.max(1, ...rawStages.map((stage) => Number(stage.count || 0)))

    const rows = rawStages.map((stage, index) => {
      const count = Number(stage.count || 0)
      const previousCount = index > 0 ? Number(rawStages[index - 1]?.count || 0) : null
      const share = activeTotal ? (count / activeTotal) * 100 : 0
      const previousRate = previousCount ? (count / previousCount) * 100 : null
      const changeFromPrevious = previousCount == null ? null : count - previousCount
      return {
        id: `${stage.stage || 'Stage'}-${index}`,
        stage: stage.stage || `Stage ${index + 1}`,
        count,
        color: stage.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        share,
        width: maxCount ? (count / maxCount) * 100 : 0,
        previousRate,
        changeFromPrevious,
      }
    })

    const enrichedRows = rows.map((row, index) => ({
      ...row,
      narrative: stageNarrative(row, index, rows),
    }))
    const activeStages = enrichedRows.filter((row) => row.count > 0).length
    const strongestStage = enrichedRows.reduce((best, row) => (row.count > (best?.count || 0) ? row : best), null)
    const bottleneck = enrichedRows
      .filter((row) => row.count > 0 && !String(row.stage).toLowerCase().includes('lost'))
      .reduce((best, row) => (row.count > (best?.count || -1) ? row : best), null)
    const convertedStage = enrichedRows.find((row) => String(row.stage).toLowerCase().includes('converted'))
    const lostStage = enrichedRows.find((row) => String(row.stage).toLowerCase().includes('lost'))
    const qualifiedCount = enrichedRows
      .filter((row) => /qualified|proposal|converted/i.test(row.stage))
      .reduce((sum, row) => sum + row.count, 0)
    const lateLeads = Number(aging.warning || 0) + Number(aging.critical || 0) + Number(sla.breached || 0)
    const avgResponse = sla.avgResponseMinutes != null ? `${Number(sla.avgResponseMinutes).toFixed(0)} min` : 'Not available'

    const notes = [
      totalLeads > 0
        ? `${formatPercent((qualifiedCount / Math.max(1, totalLeads)) * 100)} of leads are in qualified, proposal, or converted stages.`
        : 'No lead volume is available for this report yet.',
      bottleneck?.count
        ? `${bottleneck.stage} is the largest active working queue with ${formatNumber(bottleneck.count)} lead(s).`
        : 'There is no active working-stage bottleneck right now.',
      lateLeads > 0
        ? `${formatNumber(lateLeads)} lead signal(s) need attention across warning, critical, or breached SLA buckets.`
        : 'No warning, critical, or breached SLA volume is currently reported.',
    ]

    return {
      generatedAt: widgets?.generatedAt,
      totalLeads,
      activeStages,
      strongestStage,
      bottleneck,
      convertedStage,
      lostStage,
      qualifiedCount,
      lateLeads,
      avgResponse,
      rows: enrichedRows,
      sources: Array.isArray(widgets?.leadSources) ? widgets.leadSources : [],
      aging,
      sla,
      notes,
    }
  }, [widgets])

  const exportPdf = () => {
    if (!canExport) {
      toast.error('You do not have permission to export reports.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape' })
    const titleDate = new Date().toLocaleDateString()
    doc.setFontSize(16)
    doc.text(`NexaCRM Lead Funnel Report - ${titleDate}`, 14, 16)
    doc.setFontSize(9)
    doc.text(`Generated from live analytics data${report.generatedAt ? ` at ${new Date(report.generatedAt).toLocaleString()}` : ''}`, 14, 23)

    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Value', 'Meaning']],
      body: [
        ['Total Leads', formatNumber(report.totalLeads), 'All visible leads included in the funnel snapshot'],
        ['Active Stages', formatNumber(report.activeStages), 'Stages that currently contain leads'],
        ['Largest Queue', report.bottleneck?.stage || 'None', `${formatNumber(report.bottleneck?.count || 0)} lead(s)`],
        ['Late Attention', formatNumber(report.lateLeads), 'Warning, critical, and breached SLA signals'],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 165, 233] },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Stage', 'Leads', 'Share', 'Previous Stage', 'Report Note']],
      body: report.rows.map((row) => [
        row.stage,
        formatNumber(row.count),
        formatPercent(row.share),
        row.previousRate == null ? 'Entry stage' : `${formatPercent(row.previousRate)} (${row.changeFromPrevious >= 0 ? '+' : ''}${formatNumber(row.changeFromPrevious)})`,
        row.narrative,
      ]),
      styles: { fontSize: 7.2, cellWidth: 'wrap' },
      columnStyles: { 4: { cellWidth: 112 } },
      headStyles: { fillColor: [15, 23, 42] },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Executive Notes']],
      body: report.notes.map((note) => [note]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })

    doc.save(`nexacrm-lead-funnel-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('Lead funnel PDF downloaded.')
  }

  const exportExcel = async () => {
    if (!canExport) {
      toast.error('You do not have permission to export reports.')
      return
    }

    setExporting('xlsx')
    try {
      const blob = await analyticsAPI.exportReport({ format: 'xlsx', scope: 'lead-funnel' })
      saveBlob(blob, `nexacrm-lead-funnel-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Lead funnel Excel report downloaded.')
    } catch (err) {
      toast.error(err?.message || 'Failed to download Excel report')
    } finally {
      setExporting('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 animate-pulse">
          <div className="h-7 w-72 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass-card h-28 animate-pulse bg-slate-100 dark:bg-slate-800/40" />
          ))}
        </div>
      </div>
    )
  }

  const chartMax = Math.max(...report.rows.map((item) => item.count), 1)
  const chartData = report.rows.map((row) => ({
    ...row,
    displayCount: row.count > 0 ? Math.max(row.count, Math.round(chartMax * 0.18)) : 0,
    fill: row.color,
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
            <Filter className="h-4 w-4" />
            Lead Funnel Report
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Stage movement, leakage points, and follow-up health
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Live lead funnel snapshot with stage-level counts, share of pipeline, previous-stage movement, and practical review notes for sales operations.
          </p>
          {report.generatedAt ? (
            <p className="mt-2 text-xs text-slate-400">Data generated at {new Date(report.generatedAt).toLocaleString()}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={exportPdf} disabled={!canExport} className="btn-secondary gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={exportExcel} disabled={!canExport || exporting === 'xlsx'} className="btn-secondary gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            <Download className="h-4 w-4" /> {exporting === 'xlsx' ? 'Preparing...' : 'Excel'}
          </button>
        </div>
      </div>

      {!canExport ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          Report viewing is enabled. PDF and Excel download require report export permission.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Leads', value: formatNumber(report.totalLeads), detail: `${formatNumber(report.activeStages)} active stages`, icon: Users, color: 'text-sky-600' },
          { label: 'Largest Queue', value: report.bottleneck?.stage || 'None', detail: `${formatNumber(report.bottleneck?.count || 0)} lead(s)`, icon: Layers3, color: 'text-violet-600' },
          { label: 'Qualified Pipeline', value: formatPercent((report.qualifiedCount / Math.max(1, report.totalLeads)) * 100), detail: `${formatNumber(report.qualifiedCount)} qualified/proposal/converted`, icon: BadgeCheck, color: 'text-emerald-600' },
          { label: 'Attention Needed', value: formatNumber(report.lateLeads), detail: `Avg response ${report.avgResponse}`, icon: AlertTriangle, color: 'text-amber-600' },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 min-h-8 text-xl font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
              </div>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="glass-card p-4 xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Lead Funnel Shape</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current stage distribution with count labels.</p>
            </div>
            <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {formatNumber(report.totalLeads)} total leads
            </span>
          </div>
          {chartData.length && report.totalLeads > 0 ? (
            <ResponsiveContainer width="100%" height={310}>
              <FunnelChart margin={{ top: 8, right: 120, bottom: 8, left: 12 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const stage = payload[0].payload
                    return (
                      <div className="glass-card px-4 py-3 text-sm shadow-xl">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{stage.stage}</p>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">Leads: <span className="font-semibold">{formatNumber(stage.count)}</span></p>
                        <p className="text-slate-600 dark:text-slate-400">Share: <span className="font-semibold">{formatPercent(stage.share)}</span></p>
                        <p className="text-slate-600 dark:text-slate-400">Previous stage: <span className="font-semibold">{stage.previousRate == null ? 'Entry' : formatPercent(stage.previousRate)}</span></p>
                      </div>
                    )
                  }}
                />
                <Funnel dataKey="displayCount" data={chartData} isAnimationActive>
                  <LabelList position="right" fill="#475569" stroke="none" content={({ x, y, width, height, index }) => {
                    const item = chartData[index]
                    if (!item) return null
                    return (
                      <text x={x + width + 10} y={y + height / 2 + 1} dominantBaseline="central" fontSize={12}>
                        <tspan fill="#334155" fontWeight={600}>{item.stage}</tspan>
                        <tspan fill="#94a3b8">{` - ${formatNumber(item.count)}`}</tspan>
                      </text>
                    )
                  }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[310px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No funnel data available yet.
            </div>
          )}
        </div>

        <div className="glass-card p-4 xl:col-span-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Executive Reading</h2>
          </div>
          <div className="space-y-3">
            {report.notes.map((note, index) => (
              <div key={note} className="rounded-lg border border-slate-200/70 p-3 dark:border-slate-700/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Point {index + 1}</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{note}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Converted</p>
              <p className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{formatNumber(report.convertedStage?.count || 0)}</p>
            </div>
            <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/20">
              <p className="text-xs text-rose-700 dark:text-rose-300">Lost</p>
              <p className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{formatNumber(report.lostStage?.count || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/50">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Stage-by-Stage Report</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Use this table to decide where follow-up, owner capacity, or source quality needs attention.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50/80 dark:bg-slate-900/50">
              <tr>
                {['Stage', 'Leads', 'Share', 'Previous Stage', 'Report Note'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{row.stage}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatNumber(row.count)}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-40 items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, row.share)}%` }}
                          transition={{ duration: 0.5, delay: index * 0.04 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs tabular-nums text-slate-500">{formatPercent(row.share)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {row.previousRate == null ? (
                      <span className="text-slate-400">Entry stage</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {row.changeFromPrevious < 0 ? <TrendingDown className="h-3.5 w-3.5 text-amber-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-slate-400" />}
                        {formatPercent(row.previousRate)} ({row.changeFromPrevious >= 0 ? '+' : ''}{formatNumber(row.changeFromPrevious)})
                      </span>
                    )}
                  </td>
                  <td className="max-w-xl px-4 py-3 text-slate-600 dark:text-slate-400">{row.narrative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="glass-card p-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Lead Health Signals</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['Fresh', report.aging.fresh, 'bg-emerald-500'],
              ['Warning', report.aging.warning, 'bg-amber-500'],
              ['Critical', report.aging.critical, 'bg-red-500'],
              ['SLA Pending', report.sla.pending, 'bg-sky-500'],
              ['SLA Met', report.sla.met, 'bg-brand-500'],
              ['SLA Breached', report.sla.breached, 'bg-rose-500'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-lg border border-slate-200/70 p-3 dark:border-slate-700/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(value)}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full ${color}`} style={{ width: `${Math.min(100, (Number(value || 0) / Math.max(1, report.totalLeads)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Lead Source Mix</h2>
          {report.sources.length ? (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={report.sources} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={2}>
                    {report.sources.map((source, index) => (
                      <Cell key={source.name || index} fill={source.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${formatPercent(value)} share`, 'Leads']} />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.sources} layout="vertical" margin={{ left: 20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={88} />
                  <Tooltip formatter={(value) => [`${formatPercent(value)} share`, 'Source']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {report.sources.map((source, index) => (
                      <Cell key={source.name || index} fill={source.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No lead source mix available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
