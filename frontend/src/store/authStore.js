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
      setSessionFromUser: (user) =>
        set((s) => ({
          user,
          token: user ? s.token : null,
          refreshToken: user ? s.refreshToken : null,
          isAuthenticated: Boolean(user),
          authBootstrapped: true,
        })),
      markAuthBootstrapped: () => set({ authBootstrapped: true }),
    }),
    {
      name: 'nexacrm-auth',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState
        // Repair older persisted sessions that marked auth=true without storing tokens.
        if (version < 2 && persistedState.isAuthenticated && !persistedState.token) {
          return {
            ...persistedState,
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            authBootstrapped: false,
          }
        }
        return persistedState
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        authBootstrapped: state.authBootstrapped,
      }),
    }
  )
)
