import { ipcMain, dialog, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { getSettings, saveSettings } from '../../../backend/services/settings.service'
import { logService } from '../../../backend/services/log.service'
import type { IPCResponse, AppSettings } from '../../../src/shared/types'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (): Promise<IPCResponse<AppSettings>> => {
    try {
      const settings = getSettings()

      // Auto-detect mods folder if not set
      if (!settings.modsFolder) {
        const defaultModsPath = path.join(
          app.getPath('documents'),
          'My Games',
          'FarmingSimulator2025',
          'mods'
        )
        if (fs.existsSync(defaultModsPath)) {
          settings.modsFolder = defaultModsPath
          saveSettings({ modsFolder: defaultModsPath })
        }
      }

      return { success: true, data: settings }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška dohvaćanja postavki'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('settings:save', async (_event, partial: Partial<AppSettings>): Promise<IPCResponse> => {
    try {
      saveSettings(partial)
      logService.success('SETTINGS', 'Postavke spremljene')
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška spremanja postavki'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('settings:select-file', async (_event, filters?: { name: string; extensions: string[] }[]): Promise<IPCResponse<string | null>> => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: filters || [{ name: 'Executable', extensions: ['exe'] }]
      })

      if (result.canceled || !result.filePaths.length) {
        return { success: true, data: null }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška odabira datoteke'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('settings:select-folder', async (): Promise<IPCResponse<string | null>> => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })

      if (result.canceled || !result.filePaths.length) {
        return { success: true, data: null }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška odabira foldera'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('game:launch', async (_event, serverId: string): Promise<IPCResponse> => {
    try {
      const settings = getSettings()

      if (!settings.fsExePath || !fs.existsSync(settings.fsExePath)) {
        return {
          success: false,
          error: 'Farming Simulator 25 exe nije pronađen. Konfigurirajte putanju u Postavkama.'
        }
      }

      const { spawn } = await import('child_process')
      logService.info('GAME', `Pokretanje Farming Simulator 25...`)

      const child = spawn(settings.fsExePath, [], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(settings.fsExePath)
      })

      child.unref()
      logService.success('GAME', 'Farming Simulator 25 pokrenut')
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška pokretanja igre'
      logService.error('GAME', msg)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('game:check-installation', async (): Promise<IPCResponse<boolean>> => {
    try {
      const settings = getSettings()
      const exists = !!settings.fsExePath && fs.existsSync(settings.fsExePath)
      return { success: true, data: exists }
    } catch {
      return { success: true, data: false }
    }
  })
}
