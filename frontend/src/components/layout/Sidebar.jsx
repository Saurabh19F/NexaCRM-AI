import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, Users, Kanban, UserCircle, MessageSquare,
  Sparkles, Zap, Receipt, BarChart3, Shield, Settings, Link2, User,
  X, ListTodo, Bell, ShieldCheck, Activity, Building2, BadgeDollarSign,
  Lock, FileText
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { PERMISSIONS, hasPermission } from '../../utils/permissions'
import { prefetchPage } from '../../App'

const NAV_ITEMS = [
  { label: 'Dashboard',      icon: LayoutDashboard, path: '/dashboard', permission: PERMISSIONS.DASHBOARD_VIEW },
  { label: 'Leads',          icon: Users,           path: '/leads', permission: PERMISSIONS.LEADS_READ },
  { label: 'Pipeline',       icon: Kanban,          path: '/pipeline', permission: PERMISSIONS.DEALS_READ },
  { label: 'Tasks',          icon: ListTodo,        path: '/task-followup', permission: PERMISSIONS.TASKS_READ },
  { label: 'Customers',      icon: UserCircle,      path: '/customers', permission: PERMISSIONS.CUSTOMERS_READ },
  { label: 'Messages',       icon: MessageSquare,   path: '/communication', permission: PERMISSIONS.COMMUNICATIONS_READ },
  { label: 'AI Engine',      icon: Sparkles,        path: '/ai-engine', permission: PERMISSIONS.AI_USE },
  { label: 'Automation',     icon: Zap,             path: '/automation', permission: PERMISSIONS.AUTOMATION_READ },
  { label: 'Invoices',       icon: Receipt,         path: '/invoices', permission: PERMISSIONS.INVOICES_READ },
  { label: 'Analytics',      icon: BarChart3,       path: '/analytics', permission: PERMISSIONS.REPORTS_READ },
  { label: 'Team',           icon: Shield,          path: '/team', permission: PERMISSIONS.TEAM_READ },
  { label: 'Alerts',         icon: Bell,            path: '/notifications', permission: PERMISSIONS.NOTIFICATIONS_READ },
  { label: 'Profile',        icon: User,            path: '/profile' },
  { label: 'Integrations',   icon: Link2,           path: '/integrations', permission: PERMISSIONS.INTEGRATIONS_READ },
  { label: 'Settings',       icon: Settings,        path: '/settings', permission: PERMISSIONS.SETTINGS_VIEW },
]

// Platform Admin sidebar tabs — shown instead of company nav items
const PLATFORM_ADMIN_TABS = [
  { label: 'Overview',       icon: Activity,        tabKey: 'overview' },
  { label: 'Companies',      icon: Building2,       tabKey: 'companies' },
  { label: 'Users',          icon: Users,           tabKey: 'users' },
  { label: 'Subscriptions',  icon: BadgeDollarSign, tabKey: 'subscriptions' },
  { label: 'Security',       icon: Lock,            tabKey: 'security' },
  { label: 'Feature Flags',  icon: Zap,             tabKey: 'features' },
  { label: 'Audit Logs',     icon: FileText,        tabKey: 'audit' },
]

const AVATAR_STYLE_CLASS = {
  brand: 'from-brand-500 to-accent-500',
  ocean: 'from-cyan-500 to-blue-500',
  sunset: 'from-orange-500 to-rose-500',
  forest: 'from-emerald-500 to-teal-500',
  steel: 'from-slate-500 to-slate-700',
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuthStore()
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const avatarStyle = AVATAR_STYLE_CLASS[user?.avatarStyle] ?? AVATAR_STYLE_CLASS.brand
  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN'
  const rawTab = searchParams.get('tab') || 'overview'
  const activeTab = PLATFORM_ADMIN_TABS.some(t => t.tabKey === rawTab) ? rawTab : 'overview'

  const visibleNavItems = isPlatformAdmin
    ? NAV_ITEMS.filter((item) => item.path === '/profile' || item.path === '/settings')
    : NAV_ITEMS.filter((item) => !item.platformAdminOnly && hasPermission(user, item.permission))

  useEffect(() => {
    setAvatarBroken(false)
  }, [user?.avatarUrl])

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center justify-center py-5 ${isMobile ? 'px-3 gap-2' : ''}`}>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.85), rgba(20,184,166,0.85))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(14,165,233,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <span className="text-white text-lg font-black tracking-tighter">N</span>
        </div>
        {isMobile && (
          <div className="overflow-hidden flex-shrink-0">
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="text-xl font-extrabold tracking-tight text-white">Nexa</span>
              <span className="text-xl font-extrabold tracking-wider text-brand-300">CRM</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {isPlatformAdmin && (
          <>
            {/* Platform Admin section label */}
            {isMobile && (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Platform Admin</span>
              </div>
            )}
            {PLATFORM_ADMIN_TABS.map(({ label, icon: Icon, tabKey }) => {
              const isActive = location.pathname === '/admin/saas' && activeTab === tabKey
              return (
                <Link
                  key={tabKey}
                  to={`/admin/saas?tab=${tabKey}`}
                  onClick={() => setMobileOpen(false)}
                  className={`edu-nav-item ${isActive ? 'active' : ''} ${isMobile ? 'flex-row gap-3 px-3' : ''}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className={`${isMobile ? 'text-sm' : 'text-[10px] leading-tight mt-0.5'} font-medium truncate`}>{label}</span>
                </Link>
              )
            })}
            {/* Divider before Profile/Settings */}
            <div className="my-2 border-t border-white/10" />
          </>
        )}
        {visibleNavItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            onMouseEnter={() => prefetchPage(path)}
            className={({ isActive }) =>
              `edu-nav-item ${isActive ? 'active' : ''} ${isMobile ? 'flex-row gap-3 px-3' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className={`${isMobile ? 'text-sm' : 'text-[10px] leading-tight mt-0.5'} font-medium truncate`}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center ${isMobile ? 'gap-3 px-1' : 'justify-center'}`}>
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarStyle} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden ring-2 ring-white/20`}>
            {user?.avatarUrl && !avatarBroken ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              user?.name?.charAt(0) ?? 'U'
            )}
          </div>
          {isMobile && (
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — always icon-only */}
      <aside className="hidden md:flex flex-col h-screen edu-sidebar w-[82px] flex-shrink-0 relative z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay — expanded with labels */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 edu-sidebar z-50 md:hidden">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <SidebarContent isMobile />
          </aside>
        </>
      )}
    </>
  )
}
