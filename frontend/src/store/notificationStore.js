import { create } from 'zustand'
import { notificationsAPI } from '../services/api'

const typeToLower = (type) => String(type || 'SYSTEM').toLowerCase()
const directionToLower = (direction) => {
  const value = String(direction || '').toLowerCase()
  if (value === 'inbound' || value === 'incoming') return 'incoming'
  if (value === 'outbound' || value === 'outgoing') return 'sent'
  return null
}

export const formatIndianTime = (isoString) => {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    hour12: true,
  })
}

const toUiNotification = (notification) => {
  const createdAt = notification?.createdAt ? new Date(notification.createdAt) : new Date()
  const isoString = createdAt.toISOString()
  return {
    id: notification?.id,
    type: typeToLower(notification?.type),
    direction: directionToLower(notification?.direction),
    title: notification?.title || 'Notification',
    message: notification?.message || '',
    read: Boolean(notification?.isRead),
    actionUrl: notification?.actionUrl || notification?.action_url || null,
    time: formatIndianTime(isoString),
    createdAt: isoString,
  }
}

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async () => {
    set({ loading: true, error: null })
    try {
      const page = await notificationsAPI.getAll()
      const notifications = (page?.content ?? []).map(toUiNotification)
      const unreadCount = notifications.filter((n) => !n.read).length
      set({ notifications, unreadCount, loading: false })
      return notifications
    } catch (err) {
      set({ loading: false, error: err?.message || 'Failed to load notifications' })
      throw err
    }
  },

  addNotification: (notification) =>
    set((s) => {
      const isoString = new Date().toISOString()
      return {
        notifications: [{
          id: `local-${Date.now()}`,
          type: typeToLower(notification?.type),
          direction: directionToLower(notification?.direction),
          title: notification?.title || 'Notification',
          message: notification?.message || '',
          read: false,
          actionUrl: notification?.actionUrl || notification?.action_url || null,
          time: formatIndianTime(isoString),
          createdAt: isoString,
        }, ...s.notifications],
        unreadCount: s.unreadCount + 1,
      }
    }),

  markRead: async (id) => {
    try {
      if (!String(id).startsWith('local-')) {
        await notificationsAPI.markRead(id)
      }
    } catch {
      // Keep UI responsive even if API call fails for stale notification IDs.
    }

    set((s) => {
      const notifications = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    })
  },

  markAllRead: async () => {
    try {
      await notificationsAPI.markAllRead()
    } catch {
      // Keep local UI state consistent even on temporary API errors.
    }

    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  deleteNotification: async (id) => {
    try {
      if (!String(id).startsWith('local-')) {
        await notificationsAPI.delete(id)
      }
    } catch {
      // Keep local UI responsive for stale/temporary notification rows.
    }

    set((s) => {
      const notifications = s.notifications.filter((n) => n.id !== id)
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    })
  },
}))
