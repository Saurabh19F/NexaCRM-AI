import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, PlayCircle, ExternalLink, Mic, Phone, TrendingUp, Users, Target, ArrowUpRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { analyticsAPI } from '../../services/api'
import LeadConversionDashboard from './lead-conversion/LeadConversionDashboard'
import Chip from '../ui/Chip'
import Alert from '../ui/Alert'
import { LinearProgress } from '../ui/Progress'
import { Skeleton } from '../ui/Skeleton'

const INSIGHT_ROUTES = {
  'Schedule Call':  '/communication',
  'Send Follow-up': '/communication',
  'View Profile':   '/customers',
  'Plan Campaign':  '/ai-engine',
}

const glassStyle = {
  background: 'rgba(255,255,255,0.5)',
  backdropFilter: 'blur(16px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.8)',
  border: '1px solid rgba(255,255,255,0.4)',
  boxShadow: '0 4px 24px rgba(14,165,233,0.05), inset 0 1px 0 rgba(255,255,255,0.5)',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const firstName = (user?.name || 'User').trim().split(/\s+/)[0]
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }
  const [liveInsights, setLiveInsights] = useState([])
  const [recentCallSnapshots, setRecentCallSnapshots] = useState([])
  const [extrasLoading, setExtrasLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadExtras = useCallback(async () => {
    try {
      const overview = await analyticsAPI.getDashboard()
      if (!mountedRef.current) return
      setLiveInsights(Array.isArray(overview?.insights) ? overview.insights : [])
      setRecentCallSnapshots(Array.isArray(overview?.recentCallSnapshots) ? overview.recentCallSnapshots : [])
    } catch {
      // silently fail — these are supplementary widgets
    } finally {
      if (mountedRef.current) setExtrasLoading(false)
    }
  }, [])

  // Load extras after a short delay so they don't compete with the main dashboard API calls
  useEffect(() => {
    const delay = setTimeout(() => loadExtras(), 2000)
    return () => clearTimeout(delay)
  }, [loadExtras])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip label="Live" variant="filled" color="success" size="sm" icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />} />
          <Chip label="Pro Plan" variant="soft" color="primary" size="sm" icon={<Sparkles className="w-3 h-3" />} />
        </div>
      </div>

      {/* Lead Conversion Dashboard — main content */}
      <LeadConversionDashboard />

      {/* Call Intelligence + AI Insights — side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* Call Intelligence */}
        <div className="rounded-2xl p-4" style={glassStyle}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Phone className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Call Intelligence</h2>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
              <Mic className="h-3 w-3" />
              Live
            </div>
          </div>

          {extrasLoading && (
            <div className="space-y-2">
              {[1,2].map(i => (
                <div key={i} className="rounded-xl bg-white/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton width="60%" height={12} />
                  </div>
                  <Skeleton width="80%" height={10} />
                  <Skeleton width="40%" height={8} />
                </div>
              ))}
            </div>
          )}
          {!extrasLoading && recentCallSnapshots.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Phone className="h-5 w-5 text-slate-300 dark:text-slate-600" />
              <p className="mt-1.5 text-xs text-slate-400">No call recordings yet</p>
            </div>
          )}

          {recentCallSnapshots.length > 0 && (
            <div className="space-y-2">
              {recentCallSnapshots.map((item) => (
                <div
                  key={item.leadId}
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.35)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{item.leadName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{item.company || 'No company'} · {item.currentStatus}</p>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100/80 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 shrink-0">
                      {item.verdict}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5 line-clamp-2">
                    {item.summary || 'No summary available.'}
                  </p>
                  <div className="mt-2">
                    <LinearProgress value={item.confidence} color={item.confidence >= 70 ? 'success' : item.confidence >= 40 ? 'warning' : 'error'} size="xs" />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">Score: {item.confidence}%</span>
                    {item.recordingUrl ? (
                      <a
                        href={item.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <PlayCircle className="w-3 h-3" />
                        Play
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400">No recording</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="rounded-2xl p-4" style={glassStyle}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Insights</h2>
          </div>

          {extrasLoading && (
            <div className="space-y-2">
              {[1,2].map(i => (
                <div key={i} className="rounded-xl bg-white/30 p-3 space-y-2">
                  <Skeleton width="50%" height={12} />
                  <Skeleton width="90%" height={10} />
                  <Skeleton width="30%" height={8} />
                </div>
              ))}
            </div>
          )}
          {!extrasLoading && liveInsights.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Sparkles className="h-5 w-5 text-slate-300 dark:text-slate-600" />
              <p className="mt-1.5 text-xs text-slate-400">No insights available yet</p>
            </div>
          )}

          {liveInsights.length > 0 && (
            <div className="space-y-2">
              {liveInsights.map((insight) => {
                const colors = {
                  prediction: 'border-l-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10',
                  warning: 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/10',
                  opportunity: 'border-l-brand-400 bg-brand-50/50 dark:bg-brand-950/10',
                }
                return (
                  <div
                    key={insight.id}
                    className={`rounded-xl border-l-[3px] px-3 py-2.5 ${colors[insight.type] || 'border-l-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/10'}`}
                    style={{ border: '1px solid rgba(255,255,255,0.3)', borderLeftWidth: '3px' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{insight.title}</p>
                      <Chip
                        label={insight.type}
                        variant="soft"
                        size="sm"
                        color={insight.type === 'warning' ? 'warning' : insight.type === 'prediction' ? 'success' : 'primary'}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{insight.body}</p>
                    <button
                      onClick={() => navigate(INSIGHT_ROUTES[insight.action] ?? '/dashboard')}
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      {insight.action}
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
