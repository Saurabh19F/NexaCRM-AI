import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, Bell, Sun, Moon, LogOut, User, ChevronDown, RefreshCw, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useLeadsStore } from '../../store/leadsStore'
import NotificationPanel from './NotificationPanel'
import DelayAlertPanel from './DelayAlertPanel'
import { getLeadAgeMinutes } from '../../utils/leadSla'
import { connectWebSocket, disconnectWebSocket } from '../../services/websocket'
import { authAPI } from '../../services/api'

const AVATAR_STYLE_CLASS = {
  brand: 'from-violet-500 to-fuchsia-500',
  ocean: 'from-cyan-500 to-blue-500',
  sunset: 'from-orange-500 to-rose-500',
  violet: 'from-violet-600 to-purple-600',
  forest: 'from-emerald-500 to-teal-500',
  steel: 'from-slate-500 to-slate-700',
}

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'
  const { unreadCount, addNotification, fetchNotifications } = useNotificationStore()
  const { leads, patchLeadLocal } = useLeadsStore()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showDelayAlerts, setShowDelayAlerts] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [timeTick, setTimeTick] = useState(Date.now())
  const notifRef = useRef(null)
  const delayRef = useRef(null)
  const userRef = useRef(null)
  const avatarStyle = AVATAR_STYLE_CLASS[user?.avatarStyle] ?? AVATAR_STYLE_CLASS.brand

  const SLA_MINUTES = 60
  const REASSIGN_POOL = ['Priya S.', 'Rahul M.', 'Amit K.']

  const delayedLeads = useMemo(() => {
    const nowMs = timeTick
    return (leads ?? []).filter((lead) => {
      const isUnactioned = String(lead?.status ?? '').toLowerCase() === 'new'
      if (!isUnactioned) return false

      const leadSlaMinutes = Number(lead?.followUpSlaMinutes) > 0 ? Number(lead.followUpSlaMinutes) : SLA_MINUTES
      const ageMinutes = getLeadAgeMinutes(lead, nowMs)
      if (ageMinutes === null) return false
      return ageMinutes > leadSlaMinutes
    })
  }, [leads, timeTick])

  const totalDelayAlerts = delayedLeads.length

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (delayRef.current && !delayRef.current.contains(e.target)) setShowDelayAlerts(false)
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setTimeTick(Date.now()), 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    setAvatarBroken(false)
  }, [user?.avatarUrl])

  useEffect(() => {
    try {
      connectWebSocket((incoming) => {
        const type = String(incoming?.type ?? 'lead').toLowerCase()
        addNotification({
          type,
          title: incoming?.title ?? 'Notification',
          message: incoming?.message ?? 'You have a new update',
        })
      })
    } catch {
      // WebSocket unavailable — real-time notifications disabled
    }

    return () => {
      try { disconnectWebSocket() } catch { /* ignore */ }
    }
  }, [addNotification])

  useEffect(() => {
    fetchNotifications().catch(() => {
      // Notification panel still works with live websocket updates.
    })
  }, [fetchNotifications])

  useEffect(() => {
    const nowIso = new Date(timeTick).toISOString()

    for (const lead of leads ?? []) {
      const isUnactioned = String(lead?.status ?? '').toLowerCase() === 'new'
      if (!isUnactioned) continue

      const ageMinutes = getLeadAgeMinutes(lead, timeTick)
      if (ageMinutes === null) continue

      const nextPatch = {}
      const reminders = []

      if (ageMinutes >= 15 && !lead.reminder15SentAt) {
        nextPatch.reminder15SentAt = nowIso
        reminders.push({
          type: 'task',
          title: 'Lead Reminder (15 min)',
          message: `${lead.name} has no response for 15+ minutes. Please follow up now.`,
        })
      }

      if (ageMinutes >= 45 && !lead.reminder45SentAt) {
        nextPatch.reminder45SentAt = nowIso
        reminders.push({
          type: 'task',
          title: 'Lead Reminder (45 min)',
          message: `${lead.name} is still unattended for 45+ minutes.`,
        })
      }

      if (ageMinutes >= 60 && !lead.reminder60SentAt) {
        nextPatch.reminder60SentAt = nowIso
        reminders.push({
          type: 'task',
          title: 'Lead Reminder (60 min)',
          message: `${lead.name} crossed 60 minutes with no action. Immediate response required.`,
        })
      }

      if (ageMinutes >= 60 && !lead.escalatedAt) {
        nextPatch.escalatedAt = nowIso
        reminders.push({
          type: 'task',
          title: 'Lead Escalated to Admin',
          message: `${lead.name} breached SLA. ${lead.assignedTo || 'Unassigned'} needs immediate review.`,
        })
      }

      if (ageMinutes >= 60 && !lead.reassignedAt) {
        const currentOwner = lead.assignedTo || ''
        const nextOwner = REASSIGN_POOL.find((name) => name !== currentOwner) ?? currentOwner
        nextPatch.reassignedAt = nowIso
        nextPatch.assignedTo = nextOwner
        reminders.push({
          type: 'lead',
          title: 'Lead Auto-Reassigned',
          message: `${lead.name} was auto-reassigned to ${nextOwner || 'team queue'} after SLA breach.`,
        })
      }

      if (Object.keys(nextPatch).length > 0) {
        patchLeadLocal(lead.id, (prev) => ({ ...prev, ...nextPatch }))
        reminders.forEach((notification) => addNotification(notification))
      }
    }
  }, [timeTick, leads, addNotification, patchLeadLocal])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // Ignore API logout failure and clear local state anyway.
    }
    logout()
    navigate('/login')
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-20 min-h-16 flex flex-wrap sm:flex-nowrap items-center px-3 sm:px-4 py-2 sm:py-0 gap-2 sm:gap-4
                       bg-white/80 dark:bg-[#0f0b1e]/90 backdrop-blur-md
                       border-b border-slate-200/60 dark:border-violet-800/20">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="order-3 w-full sm:order-none sm:w-auto flex-1 sm:max-w-md">
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200
                         ${searchFocused
                           ? 'bg-white dark:bg-violet-950/40 ring-2 ring-brand-500/40 shadow-sm'
                           : 'bg-slate-100 dark:bg-violet-950/20'}`}>
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search leads, deals, contacts…"
            className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 rounded text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="order-2 ml-auto flex items-center gap-1">
        <button
          onClick={handleRefresh}
          className="hidden sm:inline-flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title="Refresh"
          aria-label="Refresh page"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        <div className="relative" ref={delayRef}>
          <button
            onClick={() => setShowDelayAlerts(!showDelayAlerts)}
            className="relative p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
            title="Lead delay alert"
            aria-label="Lead delay alert"
          >
            <AlertTriangle className="w-5 h-5" />
            {totalDelayAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {totalDelayAlerts > 9 ? '9+' : totalDelayAlerts}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showDelayAlerts && (
              <DelayAlertPanel
                delayedLeads={delayedLeads}
                onOpenPipeline={() => navigate('/pipeline')}
                slaMinutes={SLA_MINUTES}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarStyle} flex items-center justify-center text-white text-xs font-bold overflow-hidden`}>
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
            <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-52 glass-card py-1 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/40">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate('/profile')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
