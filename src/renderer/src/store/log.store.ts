import { create } from 'zustand'
import type { LogEntry, LogLevel } from '../../../../shared/types'

interface LogStore {
  logs: LogEntry[]
  filter: 'all' | LogLevel
  isLoading: boolean

  fetchLogs: () => Promise<void>
  clearLogs: () => Promise<void>
  addLog: (entry: LogEntry) => void
  setFilter: (filter: LogStore['filter']) => void
  getFiltered: () => LogEntry[]
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],
  filter: 'all',
  isLoading: false,

  fetchLogs: async () => {
    set({ isLoading: true })
    try {
      const res = await window.electron.getLogs()
      if (res.success && res.data) {
        set({ logs: res.data, isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  clearLogs: async () => {
    await window.electron.clearLogs()
    set({ logs: [] })
  },

  addLog: (entry) => {
    set((state) => ({
      logs: [entry, ...state.logs].slice(0, 500)
    }))
  },

  setFilter: (filter) => set({ filter }),

  getFiltered: () => {
    const { logs, filter } = get()
    if (filter === 'all') return logs
    return logs.filter((l) => l.level === filter)
  }
}))
