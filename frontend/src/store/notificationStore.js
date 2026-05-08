import { create } from 'zustand'

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'lead', title: 'New lead from Facebook', message: 'Ramesh Patel submitted a contact form', time: '2 min ago', read: false },
  { id: 2, type: 'deal', title: 'Deal moved to Proposal', message: 'Tech Solutions Inc. deal updated by Priya', time: '15 min ago', read: false },
  { id: 3, type: 'task', title: 'Follow-up overdue', message: 'Call with Arjun Sharma is 1 hour overdue', time: '1 hr ago', read: false },
  { id: 4, type: 'invoice', title: 'Invoice paid', message: 'INV-1042 ₹45,000 payment received', time: '3 hr ago', read: true },
  { id: 5, type: 'ai', title: 'AI Insight', message: 'Lead score for GlobalCorp just changed to Hot 🔥', time: '5 hr ago', read: true },
]

export const useNotificationStore = create((set, get) => ({
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,

  addNotification: (notification) =>
    set((s) => ({
      notifications: [{ ...notification, id: Date.now(), read: false, time: 'Just now' }, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),

  markRead: (id) =>
    set((s) => {
      const notifications = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    }),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}))
