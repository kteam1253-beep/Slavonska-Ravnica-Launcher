import { BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'fs/promises'
import { logService } from '../../../backend/services/log.service'
import { logsToLua } from '../../../backend/services/log-export'
import type { IPCResponse, LogEntry } from '../../../src/shared/types'

export function registerLogHandlers(): void {
  ipcMain.handle('log:export', async (event): Promise<IPCResponse<string | null>> => {
    try {
      const logs = logService.getAll().reverse()
      const options = {
        title: 'Spremi logove',
        defaultPath: `SR-Launcher-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.lua`,
        filters: [{ name: 'Lua datoteka', extensions: ['lua'] }]
      }
      const parent = BrowserWindow.fromWebContents(event.sender)
      const result = parent
        ? await dialog.showSaveDialog(parent, options)
        : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) return { success: true, data: null }
      await writeFile(result.filePath, logsToLua(logs), 'utf8')
      return { success: true, data: result.filePath }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Greška spremanja logova' }
    }
  })
  ipcMain.handle('log:get-all', async (): Promise<IPCResponse<LogEntry[]>> => {
    try {
      const logs = logService.getAll()
      return { success: true, data: logs }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška dohvaćanja logova'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('log:clear', async (): Promise<IPCResponse> => {
    try {
      logService.clear()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška brisanja logova'
      return { success: false, error: msg }
    }
  })
}
