import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users, TrendingUp, IndianRupee, AlertTriangle,
  TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles,
  Activity
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import {
  MOCK_KPI, MONTHLY_REVENUE, FUNNEL_DATA,
  LEAD_SOURCES, MOCK_ACTIVITY, AI_INSIGHTS
} from '../../utils/mockData'
import { useLeadsStore } from '../../store/leadsStore'
import { useAuthStore } from '../../store/authStore'
import { computeEmployeeSlaPerformance, computeLeadSlaSummary, getLeadAgingLevel } from '../../utils/leadSla'

const fmt = (n, currency) => {
  if (currency) return `${currency}${(n / 100000).toFixed(1)}L`
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n
}

function KPICard({ title, value, change, period, icon: Icon, color, currency }) {
  const isPositive = change >= 0
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
          {Math.abs(change)}%
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{fmt(value, currency)}</p>
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

export default function DashboardPage() {
  const navigate = useNavigate()
  const { leads } = useLeadsStore()
  const { user } = useAuthStore()
  const [timeTick, setTimeTick] = useState(Date.now())
  const firstName = (user?.name || 'User').trim().split(/\s+/)[0]

  useEffect(() => {
    const id = window.setInterval(() => setTimeTick(Date.now()), 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, {firstName} 👋 — Here&apos;s your overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPICard title="Total Leads"        value={MOCK_KPI.totalLeads.value}     change={MOCK_KPI.totalLeads.change}     period={MOCK_KPI.totalLeads.period}     icon={Users}          color="bg-gradient-to-br from-violet-500 to-fuchsia-600" />
        <KPICard title="Active Deals"       value={MOCK_KPI.totalDeals.value}     change={MOCK_KPI.totalDeals.change}     period={MOCK_KPI.totalDeals.period}     icon={TrendingUp}     color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <KPICard title="Revenue (MTD)"      value={MOCK_KPI.revenue.value}        change={MOCK_KPI.revenue.change}        period={MOCK_KPI.revenue.period}        icon={IndianRupee}    color="bg-gradient-to-br from-cyan-500 to-blue-600" currency="₹" />
        <KPICard title="Overdue Tasks"      value={MOCK_KPI.overdueTasks.value}   change={MOCK_KPI.overdueTasks.change}   period={MOCK_KPI.overdueTasks.period}   icon={AlertTriangle}  color="bg-gradient-to-br from-orange-500 to-rose-600" />
        <KPICard title="Conversion Rate"    value={MOCK_KPI.conversionRate.value} change={MOCK_KPI.conversionRate.change} period={MOCK_KPI.conversionRate.period} icon={Activity}       color="bg-gradient-to-br from-fuchsia-500 to-pink-600" />
        <KPICard title="Avg Deal Size"      value={MOCK_KPI.avgDealSize.value}    change={MOCK_KPI.avgDealSize.change}    period={MOCK_KPI.avgDealSize.period}    icon={TrendingUp}     color="bg-gradient-to-br from-amber-500 to-orange-600" currency="₹" />
      </div>

      {/* Lead Aging + SLA Monitoring */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Lead Aging Monitor</h2>
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
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Employee SLA Performance</h2>
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
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Revenue & Deals</h2>
            <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_REVENUE} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Lead Sources</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={LEAD_SOURCES} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {LEAD_SOURCES.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-3">
            {LEAD_SOURCES.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                {s.name} <span className="text-slate-400">({s.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Funnel */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Sales Funnel</h2>
          <div className="space-y-2">
            {FUNNEL_DATA.map((stage, i) => {
              const pct = Math.round((stage.count / FUNNEL_DATA[0].count) * 100)
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
          </div>
          <div className="space-y-3">
            {AI_INSIGHTS.map((insight) => (
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
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Recent Activity</h2>
          <div className="space-y-3 overflow-y-auto max-h-64 custom-scrollbar pr-1">
            {MOCK_ACTIVITY.map((item) => (
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
