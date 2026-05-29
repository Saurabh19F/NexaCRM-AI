import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      authBootstrapped: false,

      login: (user, token, refreshToken = null) =>
        set({ user, token, refreshToken, isAuthenticated: true, authBootstrapped: true }),
      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, authBootstrapped: true }),
      setTokens: (token, refreshToken = null) =>
        set((s) => ({ token, refreshToken: refreshToken ?? s.refreshToken })),
      updateUser: (updates) => set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
      setSessionFromUser: (user) => set({ user, isAuthenticated: Boolean(user), authBootstrapped: true }),
      markAuthBootstrapped: () => set({ authBootstrapped: true }),
    }),
    {
      name: 'nexacrm-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        authBootstrapped: state.authBootstrapped,
      }),
    }
  )
)
