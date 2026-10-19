import { create } from 'zustand'
import type { DiscordUser } from '../../../../shared/types'

interface AuthStore {
  isAuthenticated: boolean
  user: DiscordUser | null
  hasRequiredRole: boolean
  canUpload: boolean
  isLoading: boolean
  error: string | null

  login: () => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  user: null,
  hasRequiredRole: false,
  canUpload: false,
  isLoading: true,
  error: null,

  checkSession: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.electron.checkSession()
      if (res.success && res.data) {
        set({
          isAuthenticated: true,
          user: res.data.user,
          hasRequiredRole: res.data.hasRole,
          canUpload: !!res.data.canUpload,
          isLoading: false
        })
      } else {
        set({ isAuthenticated: false, user: null, hasRequiredRole: false, canUpload: false, isLoading: false })
      }
    } catch {
      set({ isAuthenticated: false, user: null, hasRequiredRole: false, canUpload: false, isLoading: false })
    }
  },

  login: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.electron.discordLogin()
      if (res.success && res.data) {
        // After login, re-check session to get role info
        const sessionRes = await window.electron.checkSession()
        if (sessionRes.success && sessionRes.data) {
          set({
            isAuthenticated: true,
            user: sessionRes.data.user,
            hasRequiredRole: sessionRes.data.hasRole,
            canUpload: !!sessionRes.data.canUpload,
            isLoading: false,
            error: null
          })
        } else {
          set({ isLoading: false })
        }
      } else {
        set({ isLoading: false, error: res.error || 'Greška pri prijavi' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška pri prijavi'
      set({ isLoading: false, error: msg })
    }
  },

  logout: async () => {
    await window.electron.logout()
    set({ isAuthenticated: false, user: null, hasRequiredRole: false, canUpload: false, error: null })
  },

  setError: (error) => set({ error })
}))
