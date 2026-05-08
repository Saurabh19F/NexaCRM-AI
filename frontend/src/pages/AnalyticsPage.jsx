import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import { BarChart3, TrendingUp, Trophy, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { MONTHLY_REVENUE, FUNNEL_DATA, LEAD_SOURCES, TEAM_PERFORMANCE } from '../utils/mockData'

function exportReportCSV(campaignData, monthlyRevenue, teamPerformance) {
  const rows = []

  rows.push(['=== CAMPAIGN PERFORMANCE ==='])
  rows.push(['Campaign', 'Leads', 'Cost (₹)', 'Revenue (₹)', 'ROI (%)'])
  campaignData.forEach((c) => rows.push([c.name, c.leads, c.cost, c.revenue, c.roi]))

  rows.push([])
  rows.push(['=== MONTHLY REVENUE ==='])
  rows.push(['Month', 'Revenue (₹)', 'Deals', 'Leads'])
  monthlyRevenue.forEach((m) => rows.push([m.month, m.revenue, m.deals, m.leads]))

  rows.push([])
  rows.push(['=== TEAM LEADERBOARD ==='])
  rows.push(['Name', 'Leads', 'Deals', 'Revenue (₹)', 'Conv Rate (%)'])
  teamPerformance.forEach((t) => rows.push([t.name, t.leads, t.deals, t.revenue, t.convRate]))

  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nexacrm-analytics-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Analytics report exported as CSV')
}

const CAMPAIGN_DATA = [
  { name: 'Facebook Ads',   leads: 312, cost: 45000, revenue: 820000, roi: 1722 },
  { name: 'Google Ads',     leads: 218, cost: 62000, revenue: 960000, roi: 1448 },
  { name: 'LinkedIn',       leads: 148, cost: 38000, revenue: 540000, roi: 1321 },
  { name: 'WhatsApp',       leads: 89,  cost: 12000, revenue: 310000, roi: 2483 },
  { name: 'Organic/SEO',    leads: 274, cost: 18000, revenue: 750000, roi: 4067 },
]

const RADAR_DATA = [
  { subject: 'Lead Volume',     A: 90, B: 70, C: 55 },
  { subject: 'Close Rate',      A: 85, B: 75, C: 60 },
  { subject: 'Deal Size',       A: 80, B: 65, C: 70 },
  { subject: 'Response Time',   A: 75, B: 85, C: 65 },
  { subject: 'Activity',        A: 92, B: 78, C: 68 },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-500" /> Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Performance insights for the last 6 months</p>
        </div>
        <button onClick={() => exportReportCSV(CAMPAIGN_DATA, MONTHLY_REVENUE, TEAM_PERFORMANCE)}
          className="btn-secondary gap-1.5 text-sm">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Revenue & Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₹${v/100000}L`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`₹${(v/100000).toFixed(1)}L`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Lead Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MONTHLY_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} name="Leads" />
              <Line type="monotone" dataKey="deals" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} name="Deals" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="glass-card p-5">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Campaign Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
                {['Campaign','Leads','Cost','Revenue','ROI'].map((h) => (
                  <th key={h} className="text-left py-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/30">
              {CAMPAIGN_DATA.map((c) => (
                <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{c.leads}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">₹{(c.cost/1000).toFixed(0)}k</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">₹{(c.revenue/100000).toFixed(1)}L</td>
                  <td className="py-3 px-4">
                    <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      {c.roi}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Leaderboard */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Team Leaderboard</h2>
          </div>
          <div className="space-y-4">
            {TEAM_PERFORMANCE.map((member) => (
              <div key={member.name} className="flex items-center gap-4">
                <span className="text-2xl w-8">{member.badge}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{member.name}</span>
                    <span className="text-slate-500">₹{(member.revenue/100000).toFixed(1)}L</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${member.convRate}%` }}
                      transition={{ duration: 0.8, delay: member.rank * 0.1 }}
                      className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                    />
                  </div>
                  <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
                    <span>{member.leads} leads</span>
                    <span>{member.deals} deals</span>
                    <span>{member.convRate}% conv.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Team Performance Radar</h2>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="rgba(148,163,184,0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar name="Priya S." dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
              <Radar name="Rahul M." dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              <Radar name="Amit K." dataKey="C" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
