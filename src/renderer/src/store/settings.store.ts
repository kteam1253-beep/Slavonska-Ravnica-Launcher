import { create } from 'zustand'
import type { AppSettings } from '../../../../shared/types'

const defaultSettings: AppSettings = {
  fsExePath: '',
  modsFolder: '',
  discordClientId: '',
  discordClientSecret: '',
  discordGuildId: '',
  discordBotToken: '',
  discordRequiredRoleId: '',
  discordRequiredRoleName: 'SR Member',
  autoUpdateLauncher: true,
  autoUpdateMods: false,
  launchWithWindows: false,
  ftpTimeout: 60000
}

interface SettingsStore {
  settings: AppSettings
  isLoading: boolean
  isSaving: boolean
  error: string | null

  fetchSettings: () => Promise<void>
  saveSettings: (partial: Partial<AppSettings>) => Promise<void>
  selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
  selectFolder: () => Promise<string | null>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const res = await window.electron.getSettings()
      if (res.success && res.data) {
        set({ settings: res.data, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  saveSettings: async (partial) => {
    set({ isSaving: true, error: null })
    try {
      const res = await window.electron.saveSettings(partial)
      if (res.success) {
        set((state) => ({
          settings: { ...state.settings, ...partial },
          isSaving: false
        }))
      } else {
        set({ error: res.error, isSaving: false })
      }
    } catch {
      set({ error: 'Greška spremanja postavki', isSaving: false })
    }
  },

  selectFile: async (filters) => {
    const res = await window.electron.selectFile(filters)
    return res.success ? (res.data ?? null) : null
  },

  selectFolder: async () => {
    const res = await window.electron.selectFolder()
    return res.success ? (res.data ?? null) : null
  }
}))
