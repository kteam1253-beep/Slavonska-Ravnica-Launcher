import { ipcMain } from 'electron'
import { discordService } from '../../../backend/services/discord.service'
import { backendAuthService } from '../../../backend/services/backend-auth.service'
import { logService } from '../../../backend/services/log.service'
import { isBackendMode } from '../../../src/shared/app-config'
import type { IPCResponse, GuildRole, RoleConfig } from '../../../src/shared/types'

function getToken(): string | null {
  const s = discordService.loadSession()
  return s?.user.accessToken ?? null
}

export function registerAdminHandlers(): void {
  ipcMain.handle('admin:get-roles', async (): Promise<IPCResponse<GuildRole[]>> => {
    if (!isBackendMode()) return { success: false, error: 'Admin je dostupan samo u backend modu' }
    const token = getToken()
    if (!token) return { success: false, error: 'Nisi prijavljen' }
    try {
      return { success: true, data: await backendAuthService.getRoles(token) }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Greška dohvaćanja rola' }
    }
  })

  ipcMain.handle('admin:get-config', async (): Promise<IPCResponse<RoleConfig>> => {
    if (!isBackendMode()) return { success: false, error: 'Admin je dostupan samo u backend modu' }
    const token = getToken()
    if (!token) return { success: false, error: 'Nisi prijavljen' }
    try {
      return { success: true, data: await backendAuthService.getRoleConfig(token) }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Greška' }
    }
  })

  ipcMain.handle('admin:save-config', async (_e, config: RoleConfig): Promise<IPCResponse<RoleConfig>> => {
    const token = getToken()
    if (!token) return { success: false, error: 'Nisi prijavljen' }
    try {
      const saved = await backendAuthService.saveRoleConfig(token, config)
      logService.success('ADMIN', 'Spremljena konfiguracija rola')
      return { success: true, data: saved }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Greška spremanja' }
    }
  })
}
