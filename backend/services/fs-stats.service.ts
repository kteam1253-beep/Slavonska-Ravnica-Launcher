import axios from 'axios'
import type { GameServer, ServerPingResult, ServerMod } from '../../src/shared/types'
import { sanitizeHost } from './net-util'
import { logService } from './log.service'

/**
 * Reads the Farming Simulator 25 dedicated server web stats feed:
 *   http://<ip>:<webStatsPort>/feed/dedicated-server-stats.xml?code=<webApiCode>
 * Provides LIVE players, capacity, map and version.
 */
export class FsStatsService {
  buildUrl(server: GameServer): string {
    const host = server.ip || sanitizeHost(server.ftpHost)
    const port = server.webStatsPort || 8080
    const code = encodeURIComponent((server.webApiCode || '').trim())
    return `http://${host}:${port}/feed/dedicated-server-stats.xml?code=${code}`
  }

  async fetchStats(server: GameServer): Promise<ServerPingResult | null> {
    if (!server.webApiCode || !server.webStatsPort) return null

    const url = this.buildUrl(server)
    const start = Date.now()

    try {
      const res = await axios.get<string>(url, {
        timeout: 8000,
        responseType: 'text',
        // The feed returns XML; some hosts mislabel content-type
        transformResponse: [(d) => d]
      })
      const ping = Date.now() - start
      const xml = typeof res.data === 'string' ? res.data : String(res.data)

      if (xml.includes('Error 401') || !xml.includes('<Server')) {
        logService.warning('STATS', 'Web stats feed odbijen (neispravan API kod?)')
        return null
      }

      const serverTag = xml.match(/<Server\b[^>]*>/i)?.[0] || ''
      const slotsTag = xml.match(/<Slots\b[^>]*\/?>/i)?.[0] || ''

      const version = attr(serverTag, 'version')
      const mapName = attr(serverTag, 'mapName')
      const numUsed = parseInt(attr(slotsTag, 'numUsed') || '0', 10)
      const capacity = parseInt(attr(slotsTag, 'capacity') || '0', 10)

      return {
        online: true,
        ping,
        players: Number.isFinite(numUsed) ? numUsed : 0,
        maxPlayers: capacity > 0 ? capacity : undefined,
        map: mapName || undefined,
        version: version || undefined
      }
    } catch {
      // Network error / wrong port / offline - let caller fall back to TCP ping
      return null
    }
  }

  /**
   * Returns the authoritative active mod list from the server feed, including
   * MD5 hash and the direct HTTP download URL (http://host:port/mods/<name>.zip).
   * This is the source of truth for mod sync when the web feed is configured.
   */
  async fetchServerMods(server: GameServer): Promise<ServerMod[]> {
    if (!server.webApiCode || !server.webStatsPort) return []

    const host = server.ip || sanitizeHost(server.ftpHost)
    const port = server.webStatsPort || 8080
    const url = this.buildUrl(server)

    try {
      const res = await axios.get<string>(url, {
        timeout: 12000,
        responseType: 'text',
        transformResponse: [(d) => d]
      })
      const xml = typeof res.data === 'string' ? res.data : String(res.data)

      if (xml.includes('Error 401') || !xml.includes('<Server')) {
        throw new Error('Web feed odbijen (neispravan API kod?)')
      }

      const mods: ServerMod[] = []
      for (const m of xml.matchAll(/<Mod\b[^>]*>/gi)) {
        const tag = m[0]
        const name = attr(tag, 'name')
        if (!name) continue
        const version = attr(tag, 'version') || '1.0.0'
        const hash = attr(tag, 'hash') || ''
        const fileName = name.toLowerCase().endsWith('.zip') ? name : `${name}.zip`
        const code = encodeURIComponent((server.webApiCode || '').trim())
        mods.push({
          fileName,
          version,
          // GIANTS feed hash isn't a reproducible file MD5, but it IS a stable
          // content fingerprint: it changes whenever the mod content changes
          // (even with the same version). We track it over time to detect updates.
          hash,
          size: 0, // not provided by feed; resolved from Content-Length at download
          path: `http://${host}:${port}/mods/${encodeURIComponent(fileName)}?code=${code}`,
          lastModified: new Date().toISOString()
        })
      }

      logService.success('STATS', `Web feed: ${mods.length} modova sa servera`)
      return mods
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'nepoznata greška'
      logService.error('STATS', `Web feed mod lista greška: ${msg}`)
      throw new Error(`Web feed greška: ${msg}`)
    }
  }
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))
  return m ? m[1] : undefined
}

export const fsStatsService = new FsStatsService()
