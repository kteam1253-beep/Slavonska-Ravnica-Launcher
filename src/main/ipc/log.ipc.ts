import { ipcMain } from 'electron'
import { logService } from '../../../backend/services/log.service'
import type { IPCResponse, LogEntry } from '../../../src/shared/types'

export function registerLogHandlers(): void {
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
