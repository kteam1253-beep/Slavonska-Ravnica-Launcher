import { create } from 'zustand'
import type { UploadItem } from '../../../../shared/types'

interface UploadStore {
  uploads: UploadItem[]

  fetchUploads: () => Promise<void>
  setQueue: (queue: UploadItem[]) => void
  updateItem: (item: UploadItem) => void
  selectAndUpload: (serverId: string) => Promise<{ ok: boolean; error?: string; count: number }>
  cancelUpload: (id: string) => Promise<void>
  clearFinished: () => Promise<void>

  getActiveCount: () => number
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  uploads: [],

  fetchUploads: async () => {
    const res = await window.electron.getUploads()
    if (res.success && res.data) set({ uploads: res.data })
  },

  setQueue: (queue) => set({ uploads: queue }),

  updateItem: (item) => {
    set((state) => ({
      uploads: state.uploads.map((u) => (u.id === item.id ? item : u))
    }))
  },

  selectAndUpload: async (serverId) => {
    const sel = await window.electron.selectModFiles()
    if (!sel.success || !sel.data || sel.data.length === 0) {
      return { ok: true, count: 0 }
    }
    const res = await window.electron.uploadMods(serverId, sel.data)
    return { ok: res.success, error: res.error, count: sel.data.length }
  },

  cancelUpload: async (id) => {
    await window.electron.cancelUpload(id)
  },

  clearFinished: async () => {
    await window.electron.clearFinishedUploads()
  },

  getActiveCount: () => {
    return get().uploads.filter((u) => u.status === 'uploading' || u.status === 'pending').length
  }
}))
