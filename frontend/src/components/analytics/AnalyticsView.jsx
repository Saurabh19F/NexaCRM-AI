import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { BarChart3, TrendingUp, Trophy, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyticsAPI } from '../../services/api'
import {
  buildLeadTrend,
} from '../../utils/liveMetrics'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6']

function downloadCSV(rows, filename) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)
  const [widgets, setWidgets] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [overviewData, widgetData] = await Promise.all([
          analyticsAPI.getDashboard(),
          analyticsAPI.getDashboardWidgets(),
        ])

        if (cancelled) return
        setOverview(overviewData || {})
        setWidgets(widgetData || {})
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load analytics data')
          toast.error(err?.message || 'Failed to load analytics data')
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

  const leads = Array.isArray(overview?.leads) ? overview.leads : []
  const deals = Array.isArray(overview?.deals) ? overview.deals : []
  const agingCounts = widgets?.agingCounts || {}
  const slaSummary = widgets?.slaSummary || {}
  const leadTrend = useMemo(() => buildLeadTrend(leads), [leads])
  const revenueTrend = useMemo(() => Array.isArray(widgets?.monthlyRevenue) ? widgets.monthlyRevenue : [], [widgets])
  const sourceBreakdown = useMemo(() => Array.isArray(widgets?.leadSources) ? widgets.leadSources : [], [widgets])
  const funnelBreakdown = useMemo(() => Array.isArray(widgets?.funnelData) ? widgets.funnelData : [], [widgets])
  const teamLeaderboard = useMemo(() => {
    const rows = Array.isArray(widgets?.employeePerformance) ? widgets.employeePerformance : []
    return rows.map((member, index) => {
      const total = Number(member.total || 0)
      const met = Number(member.met || 0)
      const breached = Number(member.breached || 0)
      return {
        id: member.owner || index,
        name: member.owner || 'Unassigned',
        rank: index + 1,
        badge: index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`,
        leads: total,
        deals: met,
        revenue: breached,
        convRate: total ? Math.round((met / total) * 1000) / 10 : 0,
      }
    })
  }, [widgets])

  const summary = useMemo(() => {
    const wonDeals = deals.filter((deal) => String(deal.stage || deal.status || '').toLowerCase() === 'won')
    const openDeals = deals.filter((deal) => !['won', 'lost'].includes(String(deal.stage || deal.status || '').toLowerCase())).length
    const totalRevenue = revenueTrend.reduce((sum, bucket) => sum + Number(bucket.revenue || 0), 0)
    const pending = Number(slaSummary.pending || 0)
    const avgResponse = slaSummary.avgResponseMinutes != null ? `${Number(slaSummary.avgResponseMinutes).toFixed(0)}m` : '—'

    return [
      { label: 'Leads', value: Number(slaSummary.total ?? leads.length).toLocaleString(), tone: 'brand' },
      { label: 'Open Deals', value: openDeals.toLocaleString(), tone: 'amber' },
      { label: 'Won Deals', value: wonDeals.length.toLocaleString(), tone: 'emerald' },
      { label: 'Paid Revenue', value: `₹${(totalRevenue / 100000).toFixed(1)}L`, tone: 'brand' },
      { label: 'Pending SLA', value: pending.toLocaleString(), tone: 'sky' },
      { label: 'Avg Response', value: avgResponse, tone: 'slate' },
    ]
  }, [leads.length, deals, revenueTrend, slaSummary])

  const exportReport = () => {
    const rows = [
      ['=== LEAD TREND ==='],
      ['Month', 'Leads'],
      ...leadTrend.map((row) => [row.month, row.leads]),
      [],
      ['=== REVENUE TREND ==='],
      ['Month', 'Revenue'],
      ...revenueTrend.map((row) => [row.month, row.revenue]),
      [],
      ['=== LEAD SOURCES ==='],
      ['Source', 'Share'],
      ...sourceBreakdown.map((row) => [row.name, row.value]),
      [],
      ['=== TEAM LEADERBOARD ==='],
      ['Name', 'Leads', 'SLA Met', 'SLA Breached'],
      ...teamLeaderboard.map((member) => [member.name, member.leads, member.deals, member.revenue]),
    ]
    downloadCSV(rows, `nexacrm-analytics-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Live analytics report exported as CSV')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 animate-pulse">
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass-card p-4 h-24 animate-pulse bg-slate-100 dark:bg-slate-800/40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-500" /> Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live operational reporting from leads, deals, invoices, customers, and team data
          </p>
        </div>
        <button onClick={exportReport} className="btn-secondary gap-1.5 text-sm">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {error ? (
        <div className="glass-card p-4 border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((item) => (
          <div key={item.label} className="glass-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Lead Volume</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={leadTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="leads" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Paid Revenue</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Lead Sources</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={sourceBreakdown} dataKey="value" nameKey="name" innerRadius={56} outerRadius={90} paddingAngle={3}>
                {sourceBreakdown.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Funnel Snapshot</h2>
          <div className="space-y-3">
            {funnelBreakdown.map((stage, index) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="w-28 text-sm text-slate-600 dark:text-slate-400">{stage.stage}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Number(stage.count || 0) * 8)}%` }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                  />
                </div>
                <span className="w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Team Leaderboard</h2>
          </div>
          <div className="space-y-4">
            {teamLeaderboard.map((member) => (
              <div key={member.id} className="flex items-center gap-4">
                <span className="text-2xl w-8">{member.badge}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{member.name}</span>
                    <span className="text-slate-500">{member.convRate}% SLA met</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, member.convRate)}%` }}
                      transition={{ duration: 0.7, delay: member.rank * 0.06 }}
                      className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                    />
                  </div>
                  <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
                    <span>{member.leads} leads</span>
                    <span>{member.deals} met</span>
                    <span>{member.revenue} breached</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Lead Response Health</h2>
          <div className="space-y-3">
            {[
              ['Fresh', agingCounts.fresh, 'bg-emerald-500'],
              ['Warning', agingCounts.warning, 'bg-amber-500'],
              ['Critical', agingCounts.critical, 'bg-red-500'],
              ['Pending Response', slaSummary.pending, 'bg-sky-500'],
              ['SLA Met', slaSummary.met, 'bg-brand-500'],
              ['SLA Breached', slaSummary.breached, 'bg-rose-500'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                  <span className="text-xs font-semibold text-slate-500">{Number(value || 0).toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Number(value || 0) * 8)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
