import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, PlayCircle, ExternalLink, Mic, Phone, ArrowUpRight, Radio, BrainCircuit, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { analyticsAPI } from '../../services/api'
import LeadConversionDashboard from './lead-conversion/LeadConversionDashboard'
import Chip from '../ui/Chip'
import Alert from '../ui/Alert'
import { LinearProgress } from '../ui/Progress'
import { Skeleton } from '../ui/Skeleton'
import GradientText from '../reactbits/GradientText'
import SpotlightCard from '../reactbits/SpotlightCard'
import DashboardIcon from './DashboardIcon'

const INSIGHT_ROUTES = {
  'Schedule Call':  '/communication',
  'Send Follow-up': '/communication',
  'View Profile':   '/customers',
  'Plan Campaign':  '/ai-engine',
}

const tintStyle = (rgb) => ({ '--dashboard-card-rgb': rgb })

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
      <div className="nexa-command-hero">
        <div className="nexa-command-hero__scan" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="nexa-signal-pill mb-3">
              <Radio className="h-3.5 w-3.5" />
              Live Command Center
            </div>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              <GradientText>{getGreeting()}, {firstName}</GradientText>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[460px]">
            {[
              { label: 'Live Signal', icon: Radio, tone: 'emerald' },
              { label: 'AI Assist', icon: BrainCircuit, tone: 'cyan' },
              { label: 'Secure CRM', icon: ShieldCheck, tone: 'violet' },
            ].map(({ label, icon: Icon, tone }) => (
              <div key={label} className={`nexa-orbit-tile nexa-orbit-tile--${tone}`}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
          <Chip label="Live" variant="filled" color="success" size="sm" icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />} />
          <Chip label="Pro Plan" variant="soft" color="primary" size="sm" icon={<Sparkles className="w-3 h-3" />} />
        </div>
      </div>

      {/* Lead Conversion Dashboard — main content */}
      <LeadConversionDashboard />

      {/* Call Intelligence + AI Insights — side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* Call Intelligence */}
        <SpotlightCard
          className="dashboard-color-card p-4"
          spotlightColor="rgba(14, 165, 233, 0.2)"
          style={tintStyle('6, 182, 212')}
        >
          <div className="flex items-center gap-2 mb-3">
            <DashboardIcon icon={Phone} color="from-cyan-500 to-sky-600" glow="rgba(6,182,212,0.3)" />
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
                  className="dashboard-color-card rounded-xl px-3 py-2.5"
                  style={{
                    ...tintStyle('6, 182, 212'),
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
        </SpotlightCard>

        {/* AI Insights */}
        <SpotlightCard
          className="dashboard-color-card p-4"
          spotlightColor="rgba(124, 58, 237, 0.2)"
          style={tintStyle('124, 58, 237')}
        >
          <div className="flex items-center gap-2 mb-3">
            <DashboardIcon icon={Sparkles} color="from-violet-500 to-purple-600" glow="rgba(124,58,237,0.32)" />
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
                const accentRgb = {
                  prediction: '16, 185, 129',
                  warning: '245, 158, 11',
                  opportunity: '14, 165, 233',
                }[insight.type] || '14, 165, 233'
                return (
                  <div
                    key={insight.id}
                    className={`dashboard-color-card rounded-xl border-l-[3px] px-3 py-2.5 ${colors[insight.type] || 'border-l-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/10'}`}
                    style={{ ...tintStyle(accentRgb), border: '1px solid rgba(255,255,255,0.3)', borderLeftWidth: '3px' }}
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
        </SpotlightCard>
      </div>
    </div>
  )
}
