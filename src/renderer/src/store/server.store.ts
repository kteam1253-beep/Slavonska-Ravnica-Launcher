import { create } from 'zustand'
import type { GameServer, ServerPingResult } from '../../../../shared/types'

interface ServerStore {
  servers: GameServer[]
  activeServer: GameServer | null
  isLoading: boolean
  error: string | null

  fetchServers: () => Promise<void>
  addServer: (data: Omit<GameServer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateServer: (id: string, data: Partial<GameServer>) => Promise<void>
  deleteServer: (id: string) => Promise<void>
  setActiveServer: (id: string) => Promise<void>
  pingServer: (id: string) => Promise<ServerPingResult | null>
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  activeServer: null,
  isLoading: false,
  error: null,

  fetchServers: async () => {
    set({ isLoading: true, error: null })
    try {
      const [serversRes, activeRes] = await Promise.all([
        window.electron.getServers(),
        window.electron.getActiveServer()
      ])
      if (serversRes.success) {
        set({
          servers: serversRes.data || [],
          activeServer: activeRes.data || null,
          isLoading: false
        })
      } else {
        set({ error: serversRes.error, isLoading: false })
      }
    } catch (err) {
      set({ error: 'Greška dohvaćanja servera', isLoading: false })
    }
  },

  addServer: async (data) => {
    const res = await window.electron.addServer(data)
    if (res.success) {
      await get().fetchServers()
    } else {
      set({ error: res.error })
    }
  },

  updateServer: async (id, data) => {
    const res = await window.electron.updateServer(id, data)
    if (res.success) {
      await get().fetchServers()
    } else {
      set({ error: res.error })
    }
  },

  deleteServer: async (id) => {
    const res = await window.electron.deleteServer(id)
    if (res.success) {
      await get().fetchServers()
    } else {
      set({ error: res.error })
    }
  },

  setActiveServer: async (id) => {
    const res = await window.electron.setActiveServer(id)
    if (res.success) {
      await get().fetchServers()
    } else {
      set({ error: res.error })
    }
  },

  pingServer: async (id) => {
    const res = await window.electron.pingServer(id)
    if (res.success) {
      await get().fetchServers()
      return res.data || null
    }
    return null
  }
}))
