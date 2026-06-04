import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  CheckCheck,
  User,
  Kanban,
  AlertCircle,
  Receipt,
  Sparkles,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'

const iconMap = {
  lead:    { icon: User,         color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-950/40' },
  deal:    { icon: Kanban,       color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  task:    { icon: AlertCircle,  color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  invoice: { icon: Receipt,      color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/40' },
  ai:      { icon: Sparkles,     color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-950/40' },
  communication: { icon: MessageSquare, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
}

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead, markRead, unreadCount } = useNotificationStore()
  const [viewFilter, setViewFilter] = useState('all')

  const counts = useMemo(() => {
    const communication = notifications.filter((notif) => notif.type === 'communication')
    return {
      all: notifications.length,
      incoming: communication.filter((notif) => notif.direction === 'incoming').length,
      sent: communication.filter((notif) => notif.direction === 'sent').length,
    }
  }, [notifications])

  const filteredNotifications = useMemo(() => {
    if (viewFilter === 'all') return notifications
    return notifications.filter((notif) => notif.type === 'communication' && notif.direction === viewFilter)
  }, [notifications, viewFilter])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.12 }}
      className="fixed left-2 right-2 top-[4.75rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 overflow-hidden z-50 rounded-2xl border border-slate-200/70 dark:border-slate-800/40 bg-white/98 dark:bg-slate-950/98 shadow-2xl backdrop-blur-2xl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</span>
          {unreadCount > 0 && (
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/40">
        {[
          { key: 'all', label: 'All', count: counts.all },
          { key: 'incoming', label: 'Incoming', count: counts.incoming, icon: ArrowDownLeft },
          { key: 'sent', label: 'Sent', count: counts.sent, icon: ArrowUpRight },
        ].map(({ key, label, count, icon: Icon }) => {
          const active = viewFilter === key
          return (
            <button
              key={key}
              onClick={() => setViewFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                ${active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white/70 dark:bg-slate-900/40'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {viewFilter !== 'all' && (
        <div className="px-4 pt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Showing communication messages only.
        </div>
      )}

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-100/60 dark:divide-slate-700/30 bg-white/80 dark:bg-[#120f1f]/80">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>{viewFilter === 'all' ? 'No notifications' : `No ${viewFilter} notifications`}</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const config = iconMap[notif.type] ?? iconMap.lead
            const Icon = config.icon
            const directionLabel = notif.type === 'communication'
              ? (notif.direction === 'incoming' ? 'Incoming' : notif.direction === 'sent' ? 'Sent' : null)
              : null
            return (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                  ${notif.read
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    : 'bg-brand-50/40 dark:bg-brand-950/20 hover:bg-brand-50 dark:hover:bg-brand-950/30'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-tight ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {notif.title}
                    </p>
                    {directionLabel && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide
                        ${notif.direction === 'incoming'
                          ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        {directionLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{notif.time}</p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
