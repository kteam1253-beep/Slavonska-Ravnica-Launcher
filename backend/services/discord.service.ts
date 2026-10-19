import http from 'http'
import { shell } from 'electron'
import axios from 'axios'
import { getDb, generateId } from '../../database/database'
import type { DiscordUser, GuildMember, AppSettings } from '../../src/shared/types'

const OAUTH_PORT = 3847
const OAUTH_REDIRECT = `http://localhost:${OAUTH_PORT}/callback`
const DISCORD_API = 'https://discord.com/api/v10'

export class DiscordService {
  private server: http.Server | null = null

  async startOAuthLogin(settings: AppSettings): Promise<DiscordUser> {
    const { discordClientId, discordClientSecret, discordGuildId, discordRequiredRoleId } = settings

    if (!discordClientId || !discordClientSecret) {
      throw new Error('Discord Client ID i Client Secret nisu konfigurirani. Idite u Postavke > Discord.')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopServer()
        reject(new Error('OAuth timeout - korisnik nije završio prijavu u roku od 5 minuta.'))
      }, 5 * 60 * 1000)

      this.server = http.createServer(async (req, res) => {
        if (!req.url?.startsWith('/callback')) return

        const url = new URL(req.url, `http://localhost:${OAUTH_PORT}`)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(this.getHtmlResponse(false, 'Prijava otkazana.'))
          clearTimeout(timeout)
          this.stopServer()
          reject(new Error('Discord OAuth otkazan od strane korisnika.'))
          return
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(this.getHtmlResponse(false, 'Nedostaje kod za autorizaciju.'))
          clearTimeout(timeout)
          this.stopServer()
          reject(new Error('OAuth kod nije primljen.'))
          return
        }

        try {
          const tokenData = await this.exchangeCode(code, discordClientId, discordClientSecret)
          const user = await this.fetchUser(tokenData.access_token)

          const hasRole = await this.checkMemberRole(
            user.id,
            discordGuildId,
            discordRequiredRoleId,
            settings.discordBotToken
          )

          const discordUser: DiscordUser = {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator || '0',
            avatar: user.avatar,
            email: user.email,
            globalName: user.global_name,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000
          }

          this.saveSession(discordUser, hasRole)

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(this.getHtmlResponse(true, 'Prijava uspješna! Možete zatvoriti ovaj prozor.'))

          clearTimeout(timeout)
          this.stopServer()
          resolve(discordUser)
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(this.getHtmlResponse(false, 'Greška pri prijavi. Pokušajte ponovo.'))
          clearTimeout(timeout)
          this.stopServer()
          reject(err)
        }
      })

      this.server.listen(OAUTH_PORT, () => {
        const scope = 'identify email guilds guilds.members.read'
        const params = new URLSearchParams({
          client_id: discordClientId,
          redirect_uri: OAUTH_REDIRECT,
          response_type: 'code',
          scope
        })
        const authUrl = `${DISCORD_API}/oauth2/authorize?${params}`
        shell.openExternal(authUrl)
      })

      this.server.on('error', (err) => {
        clearTimeout(timeout)
        reject(new Error(`Nije moguće pokrenuti OAuth server: ${err.message}`))
      })
    })
  }

  private async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: OAUTH_REDIRECT
    })

    const res = await axios.post(`${DISCORD_API}/oauth2/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    return res.data
  }

  private async fetchUser(accessToken: string): Promise<{
    id: string
    username: string
    discriminator: string
    avatar?: string
    email?: string
    global_name?: string
  }> {
    const res = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    return res.data
  }

  async checkMemberRole(
    userId: string,
    guildId: string,
    requiredRoleId: string,
    botToken: string
  ): Promise<boolean> {
    if (!guildId || !requiredRoleId || !botToken) return false

    try {
      const res = await axios.get<GuildMember>(
        `${DISCORD_API}/guilds/${guildId}/members/${userId}`,
        {
          headers: { Authorization: `Bot ${botToken}` }
        }
      )
      return res.data.roles?.includes(requiredRoleId) ?? false
    } catch {
      return false
    }
  }

  async sendModUploadNotification(
    botToken: string,
    channelId: string,
    upload: { fileName: string; serverName: string; size: number; uploadedBy: string }
  ): Promise<void> {
    if (!botToken) throw new Error('Discord Bot Token nije konfiguriran')

    await axios.post(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        embeds: [{
          title: '📦 Mod uploadan / ažuriran',
          color: 0x22c55e,
          fields: [
            { name: 'Mod', value: `\`${upload.fileName}\``, inline: false },
            { name: 'Server', value: upload.serverName, inline: true },
            { name: 'Veličina', value: formatBytes(upload.size), inline: true },
            { name: 'Uploadao', value: upload.uploadedBy, inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'SR Launcher V2' }
        }],
        allowed_mentions: { parse: [] }
      },
      { headers: { Authorization: `Bot ${botToken}` } }
    )
  }

  async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })

      const res = await axios.post(`${DISCORD_API}/oauth2/token`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      return res.data
    } catch {
      return null
    }
  }

  saveSession(user: DiscordUser, hasRole: boolean): void {
    const db = getDb()
    db.prepare(`
      INSERT OR REPLACE INTO auth_session (
        id, user_id, username, discriminator, avatar, email, global_name,
        access_token, refresh_token, expires_at, has_required_role, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )
    `).run(
      user.id, user.username, user.discriminator,
      user.avatar ?? null, user.email ?? null, user.globalName ?? null,
      user.accessToken, user.refreshToken,
      user.expiresAt, hasRole ? 1 : 0
    )
  }

  loadSession(): { user: DiscordUser; hasRole: boolean } | null {
    const db = getDb()
    const row = db.prepare('SELECT * FROM auth_session WHERE id = 1').get() as Record<string, unknown> | undefined

    if (!row || !row.user_id) return null

    const user: DiscordUser = {
      id: row.user_id as string,
      username: row.username as string,
      discriminator: row.discriminator as string,
      avatar: row.avatar as string | undefined,
      email: row.email as string | undefined,
      globalName: row.global_name as string | undefined,
      accessToken: row.access_token as string,
      refreshToken: row.refresh_token as string,
      expiresAt: row.expires_at as number
    }

    return { user, hasRole: (row.has_required_role as number) === 1 }
  }

  clearSession(): void {
    const db = getDb()
    db.prepare('DELETE FROM auth_session WHERE id = 1').run()
  }

  private stopServer(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  private getHtmlResponse(success: boolean, message: string): string {
    const color = success ? '#22c55e' : '#ef4444'
    const icon = success ? '✓' : '✗'
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SR Launcher V2 - ${success ? 'Uspjeh' : 'Greška'}</title>
  <style>
    body { background: #0a0a0a; color: #fff; font-family: 'Segoe UI', sans-serif;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; padding: 40px; border: 1px solid ${color};
           border-radius: 16px; max-width: 400px; }
    .icon { font-size: 64px; color: ${color}; margin-bottom: 16px; }
    h2 { color: ${color}; margin: 0 0 12px; }
    p { color: #888; margin: 0; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">${icon}</div>
    <h2>${success ? 'Uspješna prijava!' : 'Greška pri prijavi'}</h2>
    <p>${message}</p>
    <p style="margin-top:20px;font-size:12px;">Možete zatvoriti ovaj tab.</p>
  </div>
</body>
</html>`
  }
}

export const discordService = new DiscordService()

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
