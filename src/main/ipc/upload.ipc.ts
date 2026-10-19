import { ipcMain, dialog, BrowserWindow } from 'electron'
import { uploadService } from '../../../backend/services/upload.service'
import { getAllServers } from '../../../backend/services/server.service'
import { logService } from '../../../backend/services/log.service'
import type { IPCResponse, UploadItem } from '../../../src/shared/types'

export function registerUploadHandlers(): void {
  ipcMain.handle('upload:select-files', async (): Promise<IPCResponse<string[]>> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      title: 'Odaberi modove za upload',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Mod ZIP', extensions: ['zip'] }]
    })
    if (result.canceled) return { success: true, data: [] }
    return { success: true, data: result.filePaths }
  })

  ipcMain.handle('upload:enqueue', async (_e, serverId: string, filePaths: string[]): Promise<IPCResponse> => {
    try {
      const server = getAllServers().find((s) => s.id === serverId)
      if (!server) return { success: false, error: 'Server nije pronađen' }
      if (!server.ftpUsername && !server.sftpUsername) {
        return { success: false, error: 'Server nema FTP/SFTP podatke. Dodaj ih u Serveri → uredi.' }
      }
      if (!filePaths || filePaths.length === 0) return { success: true, data: { count: 0 } }

      uploadService.enqueue(server, filePaths)
      logService.info('UPLOAD', `Dodano ${filePaths.length} modova u red za upload`)
      return { success: true, data: { count: filePaths.length } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Greška uploada' }
    }
  })

  ipcMain.handle('upload:get-queue', async (): Promise<IPCResponse<UploadItem[]>> => {
    return { success: true, data: uploadService.getQueue() }
  })

  ipcMain.handle('upload:cancel', async (_e, id: string): Promise<IPCResponse> => {
    uploadService.cancel(id)
    return { success: true }
  })

  ipcMain.handle('upload:clear-finished', async (): Promise<IPCResponse> => {
    uploadService.clearFinished()
    return { success: true }
  })
}
