import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const THEME_IDS = ['light', 'dark', 'neumorphism', 'industrial', 'corporate', 'clay', 'tech']

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'nexacrm-theme' }
  )
)
