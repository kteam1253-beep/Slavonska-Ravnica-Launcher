import { ipcMain } from 'electron'
import { fsPanelService } from '../../../backend/services/fs-panel.service'
import { getAllServers } from '../../../backend/services/server.service'
import { discordService } from '../../../backend/services/discord.service'
import { backendAuthService } from '../../../backend/services/backend-auth.service'
import { logService } from '../../../backend/services/log.service'
import { isBackendMode } from '../../../src/shared/app-config'
import type { FsPanelState, IPCResponse } from '../../../src/shared/types'

type PanelAction = 'start' | 'stop' | 'restart'

async function requirePanelAdmin(): Promise<void> {
  const session = discordService.loadSession()
  if (!session) throw new Error('Nisi prijavljen')
  if (isBackendMode()) {
    const verified = await backendAuthService.verify(session.user.accessToken)
    if (!verified?.canUpload) throw new Error('Nemaš Admin / Upload dozvolu')
  } else if (!session.hasRole) {
    throw new Error('Nemaš administratorsku dozvolu')
  }
}

function serverById(serverId: string) {
  const server = getAllServers().find((item) => item.id === serverId)
  if (!server) throw new Error('Server nije pronađen')
  return server
}

export function registerPanelHandlers(): void {
  ipcMain.handle('panel:get-state', async (_event, serverId: string): Promise<IPCResponse<FsPanelState>> => {
    try {
      await requirePanelAdmin()
      return { success: true, data: await fsPanelService.getState(serverById(serverId)) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Greška FS panela'
      logService.warning('PANEL', message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('panel:action', async (
    _event,
    serverId: string,
    action: PanelAction
  ): Promise<IPCResponse> => {
    try {
      await requirePanelAdmin()
      if (!['start', 'stop', 'restart'].includes(action)) throw new Error('Nepoznata panel akcija')
      const server = serverById(serverId)
      await fsPanelService.executeAction(server, action)
      logService.success('PANEL', `${server.name}: ${action.toUpperCase()} poslan GIANTS panelu`)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Greška panel akcije'
      logService.error('PANEL', message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('panel:save-mods', async (
    _event,
    serverId: string,
    activeModIds: string[]
  ): Promise<IPCResponse> => {
    try {
      await requirePanelAdmin()
      if (!Array.isArray(activeModIds)) throw new Error('Neispravan popis modova')
      const server = serverById(serverId)
      await fsPanelService.saveActiveMods(server, activeModIds)
      logService.success('PANEL', `${server.name}: spremljena aktivacija ${activeModIds.length} modova`)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Greška aktivacije modova'
      logService.error('PANEL', message)
      return { success: false, error: message }
    }
  })
}
