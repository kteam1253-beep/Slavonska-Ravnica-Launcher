import { ipcMain } from 'electron'
import { downloadService } from '../../../backend/services/download.service'
import { getAllServers, getActiveServer } from '../../../backend/services/server.service'
import { getSettings } from '../../../backend/services/settings.service'
import type { IPCResponse, DownloadItem } from '../../../src/shared/types'

export function registerDownloadHandlers(): void {
  ipcMain.handle('download:get-queue', async (): Promise<IPCResponse<DownloadItem[]>> => {
    try {
      const queue = downloadService.getQueue()
      return { success: true, data: queue }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška dohvaćanja queue-a'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('download:pause', async (_event, id: string): Promise<IPCResponse> => {
    try {
      downloadService.pauseDownload(id)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška pauziranja'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('download:resume', async (_event, id: string): Promise<IPCResponse> => {
    try {
      const server = getActiveServer()
      if (!server) return { success: false, error: 'Nema aktivnog servera' }
      const settings = getSettings()
      downloadService.resumeDownload(id, server, settings)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška nastavka'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('download:cancel', async (_event, id: string): Promise<IPCResponse> => {
    try {
      downloadService.cancelDownload(id)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška otkazivanja'
      return { success: false, error: msg }
    }
  })
}
