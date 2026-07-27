import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, PlayCircle, ExternalLink, Mic, RefreshCw
} from 'lucide-react'
import { useLeadsStore } from '../../store/leadsStore'
import { useAuthStore } from '../../store/authStore'
import { analyticsAPI } from '../../services/api'
import LeadConversionDashboard from './lead-conversion/LeadConversionDashboard'

const INSIGHT_ROUTES = {
  'Schedule Call':  '/communication',
  'Send Follow-up': '/communication',
  'View Profile':   '/customers',
  'Plan Campaign':  '/ai-engine',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { replaceLeads } = useLeadsStore()
  const { user } = useAuthStore()
  const [liveInsights, setLiveInsights] = useState([])
  const [recentCallSnapshots, setRecentCallSnapshots] = useState([])
  const [dashboardWidgets, setDashboardWidgets] = useState({
    agingCounts: { fresh: 0, warning: 0, critical: 0 },
    slaSummary: { total: 0, unattendedCritical: 0, pending: 0, met: 0, breached: 0, avgResponseMinutes: null },
    employeePerformance: [],
    monthlyRevenue: [],
    funnelData: [],
    leadSources: [],
  })
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
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadDashboard = useCallback(async (options = {}) => {
    const silent = Boolean(options?.silent)
    const requestId = loadSeqRef.current + 1
    loadSeqRef.current = requestId

    if (!silent && mountedRef.current) {
      setDashboardLoading(true)
      setDashboardError('')
      setCallSnapshotsLoading(true)
    }

    try {
      const [overview, widgets] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getDashboardWidgets(),
      ])

      if (!mountedRef.current || loadSeqRef.current !== requestId) return

      replaceLeads(Array.isArray(overview?.leads) ? overview.leads : [])
      setLiveInsights(Array.isArray(overview?.insights) ? overview.insights : [])
      setRecentCallSnapshots(Array.isArray(overview?.recentCallSnapshots) ? overview.recentCallSnapshots : [])
      setDashboardWidgets({
        agingCounts: widgets?.agingCounts || { fresh: 0, warning: 0, critical: 0 },
        slaSummary: widgets?.slaSummary || { total: 0, unattendedCritical: 0, pending: 0, met: 0, breached: 0, avgResponseMinutes: null },
        employeePerformance: Array.isArray(widgets?.employeePerformance) ? widgets.employeePerformance : [],
        monthlyRevenue: Array.isArray(widgets?.monthlyRevenue) ? widgets.monthlyRevenue : [],
        funnelData: Array.isArray(widgets?.funnelData) ? widgets.funnelData : [],
        leadSources: Array.isArray(widgets?.leadSources) ? widgets.leadSources : [],
      })
      setCallSnapshotsLoading(false)

      setLastRefreshedAt(overview?.generatedAt || new Date().toISOString())
    } catch (err) {
      if (!mountedRef.current || loadSeqRef.current !== requestId) return
      setDashboardError(err?.message || 'Failed to load live dashboard data')
      setLiveInsights([])
      setRecentCallSnapshots([])
      setDashboardWidgets({
        agingCounts: { fresh: 0, warning: 0, critical: 0 },
        slaSummary: { total: 0, unattendedCritical: 0, pending: 0, met: 0, breached: 0, avgResponseMinutes: null },
        employeePerformance: [],
        monthlyRevenue: [],
        funnelData: [],
        leadSources: [],
      })
      setCallSnapshotsLoading(false)
    } finally {
      if (mountedRef.current && loadSeqRef.current === requestId && !silent) {
        setDashboardLoading(false)
      }
      if (mountedRef.current && loadSeqRef.current === requestId) {
        setCallSnapshotsLoading(false)
      }
    }
  }, [replaceLeads])

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

      {/* Lead Conversion Dashboard Module */}
      <LeadConversionDashboard />


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
            <p className="text-xs text-slate-500">Pulled from live call intelligence</p>
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
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

      {/* AI Insights */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand-500" />
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
                insight.type === 'opportunity'? 'bg-brand-50 border-brand-200 dark:bg-brand-950/20 dark:border-brand-800/40' :
                'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/20 dark:border-cyan-800/40'}`}>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{insight.title}</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{insight.body}</p>
              <button
                onClick={() => navigate(INSIGHT_ROUTES[insight.action] ?? '/dashboard')}
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                {insight.action} →
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
