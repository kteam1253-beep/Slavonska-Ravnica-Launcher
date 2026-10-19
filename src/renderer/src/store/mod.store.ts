import { create } from 'zustand'
import type { Mod, SyncResult } from '../../../../shared/types'

interface ModStore {
  mods: Mod[]
  syncResult: SyncResult | null
  isSyncing: boolean
  isLoading: boolean
  error: string | null
  filter: 'all' | Mod['status']
  searchQuery: string

  fetchMods: (serverId: string) => Promise<void>
  syncMods: (serverId: string) => Promise<SyncResult | null>
  downloadMissing: (serverId: string) => Promise<void>
  updateAllMods: (serverId: string) => Promise<void>
  syncAll: (serverId: string) => Promise<void>
  deleteObsolete: (serverId: string) => Promise<void>
  downloadSingle: (modId: string) => Promise<void>
  setFilter: (filter: ModStore['filter']) => void
  setSearch: (query: string) => void

  getFiltered: () => Mod[]
  getCounts: () => Record<string, number>
}

export const useModStore = create<ModStore>((set, get) => ({
  mods: [],
  syncResult: null,
  isSyncing: false,
  isLoading: false,
  error: null,
  filter: 'all',
  searchQuery: '',

  fetchMods: async (serverId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.electron.getMods(serverId)
      if (res.success) {
        set({ mods: res.data || [], isLoading: false })
      } else {
        set({ error: res.error, isLoading: false })
      }
    } catch {
      set({ error: 'Greška dohvaćanja modova', isLoading: false })
    }
  },

  syncMods: async (serverId) => {
    set({ isSyncing: true, error: null })
    try {
      const res = await window.electron.syncMods(serverId)
      if (res.success && res.data) {
        set({ mods: res.data.mods, syncResult: res.data, isSyncing: false })
        return res.data
      } else {
        set({ error: res.error || 'Greška sinkronizacije', isSyncing: false })
        return null
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška sinkronizacije'
      set({ error: msg, isSyncing: false })
      return null
    }
  },

  downloadMissing: async (serverId) => {
    const res = await window.electron.downloadMissing(serverId)
    if (!res.success) set({ error: res.error })
  },

  updateAllMods: async (serverId) => {
    const res = await window.electron.updateAllMods(serverId)
    if (!res.success) set({ error: res.error })
  },

  syncAll: async (serverId) => {
    set({ isSyncing: true, error: null })
    try {
      const res = await window.electron.syncAllMods(serverId)
      if (res.success && res.data) {
        set({ mods: res.data.mods, syncResult: res.data, isSyncing: false })
      } else {
        set({ error: res.error || 'GreÅ¡ka potpune sinkronizacije', isSyncing: false })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GreÅ¡ka potpune sinkronizacije'
      set({ error: msg, isSyncing: false })
    }
  },

  deleteObsolete: async (serverId) => {
    const res = await window.electron.deleteObsolete(serverId)
    if (res.success) {
      await get().fetchMods(serverId)
    } else {
      set({ error: res.error })
    }
  },

  downloadSingle: async (modId) => {
    const res = await window.electron.downloadMod(modId)
    if (!res.success) set({ error: res.error })
  },

  setFilter: (filter) => set({ filter }),
  setSearch: (searchQuery) => set({ searchQuery }),

  getFiltered: () => {
    const { mods, filter, searchQuery } = get()
    let result = mods

    if (filter !== 'all') {
      result = result.filter((m) => m.status === filter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.fileName.toLowerCase().includes(q)
      )
    }

    return result
  },

  getCounts: () => {
    const { mods } = get()
    return {
      total: mods.length,
      OK: mods.filter((m) => m.status === 'OK').length,
      UPDATE: mods.filter((m) => m.status === 'UPDATE').length,
      NOVI: mods.filter((m) => m.status === 'NOVI').length,
      FALI: mods.filter((m) => m.status === 'FALI').length,
      GREŠKA: mods.filter((m) => m.status === 'GREŠKA').length
    }
  }
}))
