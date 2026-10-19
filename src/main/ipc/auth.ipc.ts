import { ipcMain } from 'electron'
import { discordService } from '../../../backend/services/discord.service'
import { backendAuthService } from '../../../backend/services/backend-auth.service'
import { upsertServersFromConfig } from '../../../backend/services/server.service'
import { getSettings } from '../../../backend/services/settings.service'
import { logService } from '../../../backend/services/log.service'
import { getDb } from '../../../database/database'
import { isBackendMode } from '../../../src/shared/app-config'
import type { AppLanguage, IPCResponse } from '../../../src/shared/types'

const LANGUAGES: AppLanguage[] = ['hr', 'en', 'de', 'fr']

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:discord-login', async (): Promise<IPCResponse> => {
    try {
      // Zero-config distribution mode: all secrets live on the backend
      if (isBackendMode()) {
        const { user, hasRole } = await backendAuthService.login()
        discordService.saveSession(user, hasRole)
        if (hasRole) {
          const servers = await backendAuthService.fetchConfig(user.accessToken)
          upsertServersFromConfig(servers)
        }
        logService.success('AUTH', `Prijava uspješna: ${user.username} (rola: ${hasRole ? 'DA' : 'NE'})`)
        return { success: true, data: user }
      }

      // Local mode: client does the OAuth using Settings > Discord
      logService.info('AUTH', 'Pokrenuta Discord prijava')
      const settings = getSettings()
      const user = await discordService.startOAuthLogin(settings)
      logService.success('AUTH', `Discord prijava uspješna: ${user.username}`)
      return { success: true, data: user }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška pri Discord prijavi'
      logService.error('AUTH', msg)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('auth:check-session', async (): Promise<IPCResponse> => {
    try {
      const session = discordService.loadSession()
      if (!session) return { success: true, data: null }

      // Backend mode: re-verify the session token against the backend
      if (isBackendMode()) {
        const verified = await backendAuthService.verify(session.user.accessToken)
        if (!verified) {
          discordService.clearSession()
          return { success: true, data: null }
        }
        discordService.saveSession(verified.user, verified.hasRole)
        if (verified.hasRole) {
          const servers = await backendAuthService.fetchConfig(verified.user.accessToken)
          upsertServersFromConfig(servers)
        }
        return { success: true, data: { user: verified.user, hasRole: verified.hasRole, canUpload: verified.canUpload } }
      }

      const { user, hasRole } = session

      // Check if token is expired
      if (user.expiresAt < Date.now()) {
        const settings = getSettings()
        if (!settings.discordClientId || !settings.discordClientSecret) {
          return { success: true, data: null }
        }

        const refreshed = await discordService.refreshToken(
          user.refreshToken,
          settings.discordClientId,
          settings.discordClientSecret
        )

        if (!refreshed) {
          discordService.clearSession()
          return { success: true, data: null }
        }

        user.accessToken = refreshed.access_token
        user.refreshToken = refreshed.refresh_token
        user.expiresAt = Date.now() + refreshed.expires_in * 1000
      }

      // Re-check role
      const settings = getSettings()
      const currentRole = await discordService.checkMemberRole(
        user.id,
        settings.discordGuildId,
        settings.discordRequiredRoleId,
        settings.discordBotToken
      )

      logService.info('AUTH', `Sesija obnovljena: ${user.username} (rola: ${currentRole ? 'DA' : 'NE'})`)
      return { success: true, data: { user, hasRole: currentRole } }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška provjere sesije'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('auth:logout', async (): Promise<IPCResponse> => {
    try {
      discordService.clearSession()
      logService.info('AUTH', 'Korisnik odjavljen')
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška odjave'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('auth:check-role', async (_event, userId: string): Promise<IPCResponse> => {
    try {
      const settings = getSettings()
      const hasRole = await discordService.checkMemberRole(
        userId,
        settings.discordGuildId,
        settings.discordRequiredRoleId,
        settings.discordBotToken
      )
      return { success: true, data: hasRole }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška provjere role'
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('auth:get-user-language', async (_event, userId: string): Promise<IPCResponse<AppLanguage>> => {
    const row = getDb().prepare('SELECT language FROM user_preferences WHERE user_id = ?').get(userId) as { language?: string } | undefined
    const language = LANGUAGES.includes(row?.language as AppLanguage) ? row!.language as AppLanguage : 'hr'
    return { success: true, data: language }
  })

  ipcMain.handle('auth:save-user-language', async (_event, userId: string, language: AppLanguage): Promise<IPCResponse<AppLanguage>> => {
    if (!LANGUAGES.includes(language)) return { success: false, error: 'Unsupported language' }
    getDb().prepare(`
      INSERT INTO user_preferences (user_id, language, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET language = excluded.language, updated_at = datetime('now')
    `).run(userId, language)
    return { success: true, data: language }
  })
}
