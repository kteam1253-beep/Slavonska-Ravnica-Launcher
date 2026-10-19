import axios, { AxiosInstance } from 'axios'
import type { GameServer, ServerMod, ServerPingResult } from '../../src/shared/types'
import { logService } from './log.service'

interface ApiModEntry {
  fileName: string
  version: string
  build?: string
  hash: string
  sha256?: string
  crc32?: string
  size: number
  path: string
  lastModified: string
}

interface ApiServerInfo {
  name: string
  map: string
  players: number
  maxPlayers: number
  version: string
  status: string
}

export class RestApiService {
  private createClient(server: GameServer): AxiosInstance {
    const instance = axios.create({
      baseURL: server.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(server.apiKey ? { 'X-API-Key': server.apiKey, Authorization: `Bearer ${server.apiKey}` } : {})
      }
    })
    return instance
  }

  async listMods(server: GameServer): Promise<ServerMod[]> {
    const client = this.createClient(server)

    try {
      const res = await client.get<ApiModEntry[]>('/api/mods')
      const mods: ServerMod[] = res.data.map((mod) => ({
        fileName: mod.fileName,
        version: mod.version || '1.0.0',
        build: mod.build || '',
        hash: mod.hash || '',
        sha256: mod.sha256 || '',
        crc32: mod.crc32 || '',
        size: mod.size || 0,
        path: mod.path || `/mods/${mod.fileName}`,
        lastModified: mod.lastModified || new Date().toISOString()
      }))

      logService.success('REST', `Učitano ${mods.length} modova s API servera`)
      return mods
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nepoznata greška'
      logService.error('REST', `REST API greška: ${msg}`)
      throw new Error(`REST API greška: ${msg}`)
    }
  }

  async getServerInfo(server: GameServer): Promise<ApiServerInfo | null> {
    const client = this.createClient(server)

    try {
      const res = await client.get<ApiServerInfo>('/api/server/info')
      return res.data
    } catch {
      return null
    }
  }

  async getDownloadUrl(server: GameServer, mod: ServerMod): Promise<string> {
    if (server.apiUrl) {
      return `${server.apiUrl}/api/mods/download/${encodeURIComponent(mod.fileName)}`
    }
    throw new Error('API URL nije konfiguriran')
  }

  async testConnection(server: GameServer): Promise<boolean> {
    const client = this.createClient(server)

    try {
      await client.get('/api/health', { timeout: 5000 })
      return true
    } catch {
      try {
        await client.get('/api/mods', { timeout: 5000 })
        return true
      } catch {
        return false
      }
    }
  }

  async pingServer(server: GameServer): Promise<ServerPingResult> {
    const start = Date.now()

    try {
      const info = await this.getServerInfo(server)
      const ping = Date.now() - start

      if (info) {
        return {
          online: true,
          ping,
          players: info.players,
          maxPlayers: info.maxPlayers,
          map: info.map,
          version: info.version
        }
      }
      return { online: true, ping }
    } catch {
      return { online: false, ping: -1 }
    }
  }
}

export const restApiService = new RestApiService()
