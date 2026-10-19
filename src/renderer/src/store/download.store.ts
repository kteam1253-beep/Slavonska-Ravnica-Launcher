import { create } from 'zustand'
import type { DownloadItem, DownloadProgress } from '../../../../shared/types'

interface DownloadStore {
  downloads: DownloadItem[]

  fetchDownloads: () => Promise<void>
  updateProgress: (progress: DownloadProgress) => void
  setQueue: (queue: DownloadItem[]) => void
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>

  getActiveCount: () => number
  getTotalProgress: () => number
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloads: [],

  fetchDownloads: async () => {
    const res = await window.electron.getDownloads()
    if (res.success && res.data) {
      set({ downloads: res.data })
    }
  },

  updateProgress: (progress) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === progress.id
          ? {
              ...d,
              downloadedSize: progress.downloadedSize,
              totalSize: progress.totalSize,
              speed: progress.speed,
              eta: progress.eta,
              progress: progress.progress,
              status: progress.status
            }
          : d
      )
    }))
  },

  setQueue: (queue) => set({ downloads: queue }),

  pauseDownload: async (id) => {
    await window.electron.pauseDownload(id)
  },

  resumeDownload: async (id) => {
    await window.electron.resumeDownload(id)
  },

  cancelDownload: async (id) => {
    await window.electron.cancelDownload(id)
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id)
    }))
  },

  getActiveCount: () => {
    return get().downloads.filter(
      (d) => d.status === 'downloading' || d.status === 'pending' || d.status === 'verifying'
    ).length
  },

  getTotalProgress: () => {
    const active = get().downloads.filter(
      (d) => d.status === 'downloading' || d.status === 'verifying'
    )
    if (active.length === 0) return 0
    return active.reduce((sum, d) => sum + d.progress, 0) / active.length
  }
}))
