import { ipcMain } from 'electron'
import { modSyncService } from '../../../backend/services/mod-sync.service'
import { downloadService } from '../../../backend/services/download.service'
import { getAllServers, getActiveServer } from '../../../backend/services/server.service'
import { getSettings } from '../../../backend/services/settings.service'
import { logService } from '../../../backend/services/log.service'
import type { IPCResponse, Mod, SyncResult } from '../../../src/shared/types'

export function registerModHandlers(): void {
  ipcMain.handle('mods:get-all', async (_event, serverId: string): Promise<IPCResponse<Mod[]>> => {
    try {
      const mods = modSyncService.getModsFromDb(serverId)
      return { success: true, data: mods }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška dohvaćanja modova'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('mods:sync', async (_event, serverId: string): Promise<IPCResponse<SyncResult>> => {
    try {
      const servers = getAllServers()
      const server = servers.find((s) => s.id === serverId)
      if (!server) return { success: false, error: 'Server nije pronađen' }

      const settings = getSettings()
      const result = await modSyncService.syncServer(server, settings)
      return { success: true, data: result }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška sinkronizacije'
      logService.error('MODS', msg)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('mods:download-missing', async (_event, serverId: string): Promise<IPCResponse> => {
    try {
      const servers = getAllServers()
      const server = servers.find((s) => s.id === serverId)
      if (!server) return { success: false, error: 'Server nije pronađen' }

      const mods = modSyncService.getModsFromDb(serverId)
      const missing = mods.filter((m) => m.status === 'FALI')

      const settings = getSettings()
      await downloadService.downloadMultiple(missing, server, settings)

      logService.info('MODS', `Pokrenuto preuzimanje ${missing.length} modova koji fale`)
      return { success: true, data: { count: missing.length } }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška preuzimanja'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('mods:update-all', async (_event, serverId: string): Promise<IPCResponse> => {
    try {
      const servers = getAllServers()
      const server = servers.find((s) => s.id === serverId)
      if (!server) return { success: false, error: 'Server nije pronađen' }

      const mods = modSyncService.getModsFromDb(serverId)
      const toUpdate = mods.filter((m) => m.status === 'UPDATE')

      const settings = getSettings()
      await downloadService.downloadMultiple(toUpdate, server, settings)

      logService.info('MODS', `Pokrenuto ažuriranje ${toUpdate.length} modova`)
      return { success: true, data: { count: toUpdate.length } }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška ažuriranja'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('mods:sync-all', async (_event, serverId: string): Promise<IPCResponse> => {
    try {
      const servers = getAllServers()
      const server = servers.find((s) => s.id === serverId)
      if (!server) return { success: false, error: 'Server nije pronađen' }

      const settings = getSettings()

      // First sync to get current status
      const result = await modSyncService.syncServer(server, settings)

      // Download all that are not OK
      const toDownload = result.mods.filter((m) => m.status === 'FALI' || m.status === 'UPDATE' || m.status === 'GREŠKA')
      if (toDownload.length > 0) {
        await downloadService.downloadMultiple(toDownload, server, settings)
      }

      logService.info('MODS', `Pokrenuta potpuna sinkronizacija: ${toDownload.length} modova za preuzimanje`)
      return { success: true, data: result }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška potpune sinkronizacije'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('mods:delete-obsolete', async (_event, serverId: string): Promise<IPCResponse> => {
    try {
      const settings = getSettings()
      const mods = modSyncService.getModsFromDb(serverId)
      const obsolete = mods.filter((m) => m.status === 'NOVI' && m.localPath)

      const fs = await import('fs')
      let deleted = 0

      for (const mod of obsolete) {
        if (mod.localPath && fs.existsSync(mod.localPath)) {
          fs.unlinkSync(mod.localPath)
          deleted++
          logService.info('MODS', `Obrisan zastarjeli mod: ${mod.fileName}`)
        }
      }

      return { success: true, data: { deleted } }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška brisanja zastarjelih modova'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('mods:download-single', async (_event, modId: string): Promise<IPCResponse> => {
    try {
      const server = getActiveServer()
      if (!server) return { success: false, error: 'Nema aktivnog servera' }

      const mods = modSyncService.getModsFromDb(server.id)
      const mod = mods.find((m) => m.id === modId)
      if (!mod) return { success: false, error: 'Mod nije pronađen' }

      const settings = getSettings()
      await downloadService.downloadMod(mod, server, settings)

      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška preuzimanja moda'
      return { success: false, error: msg }
    }
  })
}
