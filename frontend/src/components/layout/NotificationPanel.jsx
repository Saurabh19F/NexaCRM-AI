import { motion } from 'framer-motion'
import { Bell, CheckCheck, User, Kanban, AlertCircle, Receipt, Sparkles } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'

const iconMap = {
  lead:    { icon: User,         color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-950/40' },
  deal:    { icon: Kanban,       color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  task:    { icon: AlertCircle,  color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  invoice: { icon: Receipt,      color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/40' },
  ai:      { icon: Sparkles,     color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40' },
}

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead, markRead, unreadCount } = useNotificationStore()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-96 glass-card overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/40">
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
            className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-100/60 dark:divide-slate-700/30">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const config = iconMap[notif.type] ?? iconMap.lead
            const Icon = config.icon
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
                  <p className={`text-sm font-medium leading-tight ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {notif.title}
                  </p>
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
