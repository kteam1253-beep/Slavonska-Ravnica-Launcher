import { ipcMain } from 'electron'
import { discordService } from '../../../backend/services/discord.service'
import { backendAuthService } from '../../../backend/services/backend-auth.service'
import { logService } from '../../../backend/services/log.service'
import { isBackendMode } from '../../../src/shared/app-config'
import type { IPCResponse, SowingTableRow, SowingTablesState } from '../../../src/shared/types'

async function requireSowingAdmin(): Promise<string> {
  const session = discordService.loadSession()
  if (!session) throw new Error('Nisi prijavljen')
  if (!isBackendMode()) throw new Error('Tablica sjetve treba launcher backend')

  const verified = await backendAuthService.verify(session.user.accessToken)
  if (!verified?.canUpload) throw new Error('Nemas Admin / Upload dozvolu')
  return session.user.accessToken
}

export function registerSowingTableHandlers(): void {
  ipcMain.handle('sowing-tables:get', async (): Promise<IPCResponse<SowingTablesState>> => {
    try {
      const token = await requireSowingAdmin()
      return { success: true, data: await backendAuthService.fetchSowingTables(token) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Greska tablice sjetve'
      logService.warning('SJETVA', message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('sowing-tables:save', async (
    _event,
    farmKey: string,
    rows: SowingTableRow[],
    yearLabels: string[]
  ): Promise<IPCResponse<SowingTablesState>> => {
    try {
      const token = await requireSowingAdmin()
      if (!Array.isArray(rows)) throw new Error('Neispravni redovi tablice')
      const data = await backendAuthService.saveSowingTable(token, farmKey, rows, yearLabels)
      logService.success('SJETVA', `Tablica sjetve spremljena za ${farmKey}`)
      return { success: true, data }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Spremanje tablice nije uspjelo'
      logService.error('SJETVA', message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('sowing-tables:refresh', async (
    _event,
    farmKey: string
  ): Promise<IPCResponse<SowingTablesState>> => {
    try {
      const token = await requireSowingAdmin()
      const data = await backendAuthService.refreshSowingTable(token, farmKey)
      logService.success('SJETVA', `Discord tablica osvjezena za ${farmKey}`)
      return { success: true, data }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refresh tablice nije uspio'
      logService.error('SJETVA', message)
      return { success: false, error: message }
    }
  })
}
