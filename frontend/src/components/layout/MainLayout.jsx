import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Users, Clock, CheckCircle2, Plus, UserPlus, MessageSquare, Sparkles, Receipt, Kanban } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Breadcrumb from './Breadcrumb'
import SpeedDial from '../ui/SpeedDial'

function StatusBar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 60000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="edu-status-bar text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-brand-500" />
          <span className="font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-accent-500" />
          <span>Team Online</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span className="font-medium text-emerald-600 dark:text-emerald-400">System Status: All Good</span>
      </div>
    </div>
  )
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const navigate = useNavigate()

  const speedDialActions = [
    { label: 'New Lead', icon: <UserPlus className="w-5 h-5 text-brand-500" />, onClick: () => navigate('/leads'), color: 'bg-brand-50 dark:bg-brand-950/30' },
    { label: 'Send Message', icon: <MessageSquare className="w-5 h-5 text-emerald-500" />, onClick: () => navigate('/communication'), color: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'AI Assistant', icon: <Sparkles className="w-5 h-5 text-violet-500" />, onClick: () => navigate('/ai-engine'), color: 'bg-violet-50 dark:bg-violet-950/30' },
    { label: 'New Invoice', icon: <Receipt className="w-5 h-5 text-sky-500" />, onClick: () => navigate('/invoices'), color: 'bg-sky-50 dark:bg-sky-950/30' },
    { label: 'Pipeline', icon: <Kanban className="w-5 h-5 text-amber-500" />, onClick: () => navigate('/pipeline'), color: 'bg-amber-50 dark:bg-amber-950/30' },
  ]

  return (
    <div className="relative flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ccfbf1 25%, #f0f9ff 50%, #d1fae5 75%, #e0f2fe 100%)' }}>
      {/* Dark mode background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{ background: 'linear-gradient(135deg, #0c1222 0%, #0f172a 50%, #0c1222 100%)' }}
      />
      {/* Glassmorphism gradient orbs — gives color variation for glass to refract */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 700px 500px at 15% 8%, rgba(14,165,233,0.15), transparent),
            radial-gradient(ellipse 600px 400px at 85% 15%, rgba(20,184,166,0.12), transparent),
            radial-gradient(ellipse 500px 400px at 50% 80%, rgba(139,92,246,0.08), transparent),
            radial-gradient(ellipse 400px 300px at 70% 60%, rgba(14,165,233,0.06), transparent)
          `,
        }}
      />
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1600px]" key={refreshKey}>
            <Breadcrumb />
            <Outlet />
          </div>
        </main>
        <StatusBar />
      </div>

      {/* Floating Action Button — Quick Actions */}
      <SpeedDial actions={speedDialActions} />
    </div>
  )
}
