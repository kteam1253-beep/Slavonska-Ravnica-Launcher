import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import yauzl from 'yauzl'
import { getDb, generateId } from '../../database/database'
import { ftpService } from './ftp.service'
import { sftpService } from './sftp.service'
import { restApiService } from './rest-api.service'
import { fsStatsService } from './fs-stats.service'
import { logService } from './log.service'
import type {
  GameServer,
  Mod,
  ModStatus,
  ServerMod,
  LocalMod,
  SyncResult,
  AppSettings
} from '../../src/shared/types'

export class ModSyncService {
  async syncServer(server: GameServer, settings: AppSettings): Promise<SyncResult> {
    logService.info('SYNC', `Pokretanje sinkronizacije za server: ${server.name}`)

    const modsFolder = settings.modsFolder
    if (!modsFolder || !fs.existsSync(modsFolder)) {
      throw new Error(`Mods folder ne postoji: ${modsFolder}. Konfigurirajte ga u Postavkama.`)
    }

    const [serverMods, localMods] = await Promise.all([
      this.getServerMods(server),
      this.getLocalMods(modsFolder)
    ])

    logService.info('SYNC', `Server: ${serverMods.length} modova, Lokalno: ${localMods.length} modova`)

    const mods = await this.compareMods(server.id, serverMods, localMods, modsFolder)
    this.saveModsToDb(server.id, mods)
    this.updateServerLastSync(server.id)

    const result: SyncResult = {
      total: mods.length,
      ok: mods.filter((m) => m.status === 'OK').length,
      missing: mods.filter((m) => m.status === 'FALI').length,
      updates: mods.filter((m) => m.status === 'UPDATE').length,
      newMods: mods.filter((m) => m.status === 'NOVI').length,
      errors: mods.filter((m) => m.status === 'GREŠKA').length,
      mods
    }

    logService.success(
      'SYNC',
      `Sinkronizacija završena: ${result.ok} OK, ${result.missing} fali, ${result.updates} update, ${result.newMods} novi`
    )

    return result
  }

  private async getServerMods(server: GameServer): Promise<ServerMod[]> {
    // Prefer the FS25 dedicated server web feed when configured: it is the
    // authoritative active mod list with MD5 hashes + direct HTTP downloads.
    if (server.webStatsPort && server.webApiCode) {
      try {
        return await fsStatsService.fetchServerMods(server)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'nepoznata greÅ¡ka'
        logService.warning('SYNC', `Web feed nije dostupan, pokusavam fallback izvor modova: ${msg}`)
        if (!this.canUseConfiguredModSource(server)) {
          throw new Error(`${msg}. Provjeri Web API kod/port na serveru ili konfiguriraj FTP/SFTP/REST fallback.`)
        }
      }
    }
    switch (server.connectionType) {
      case 'ftp':
        return ftpService.listMods(server)
      case 'sftp':
        return sftpService.listMods(server)
      case 'rest':
        return restApiService.listMods(server)
      default:
        throw new Error(`Nepoznat tip veze: ${server.connectionType}`)
    }
  }

  private canUseConfiguredModSource(server: GameServer): boolean {
    switch (server.connectionType) {
      case 'ftp':
        return !!(server.ftpHost && server.ftpUsername && server.ftpPassword)
      case 'sftp':
        return !!(server.sftpHost && server.sftpUsername && server.sftpPassword)
      case 'rest':
        return !!server.apiUrl
      default:
        return false
    }
  }

  async getLocalMods(modsFolder: string): Promise<LocalMod[]> {
    const mods: LocalMod[] = []

    if (!fs.existsSync(modsFolder)) return mods

    const files = fs.readdirSync(modsFolder)

    for (const file of files) {
      if (!file.endsWith('.zip') && !file.endsWith('.ZIP')) continue

      const filePath = path.join(modsFolder, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) continue

      // Read modDesc.xml metadata, falling back to the filename if the zip can't be read.
      const desc = await readModDescMetadata(filePath)
      mods.push({
        fileName: file,
        version: desc.version || this.extractVersionFromName(file),
        build: desc.build,
        hash: '',
        size: stat.size,
        path: filePath,
        lastModified: stat.mtime.toISOString()
      })
    }

    return mods
  }

  private async compareMods(
    serverId: string,
    serverMods: ServerMod[],
    localMods: LocalMod[],
    modsFolder: string
  ): Promise<Mod[]> {
    const localMap = new Map<string, LocalMod>()
    localMods.forEach((m) => localMap.set(m.fileName.toLowerCase(), m))

    const mods: Mod[] = []

    for (const serverMod of serverMods) {
      const localMod = localMap.get(serverMod.fileName.toLowerCase())
      let status: ModStatus

      if (!localMod) {
        status = 'FALI'
      } else {
        status = await this.getUpdateStatus(serverId, serverMod, localMod)
      }

      mods.push({
        id: generateId(),
        serverId,
        name: this.getModDisplayName(serverMod.fileName),
        fileName: serverMod.fileName,
        localVersion: localMod?.version,
        serverVersion: serverMod.version,
        localHash: localMod?.hash,
        serverHash: serverMod.hash,
        localSize: localMod?.size,
        serverSize: serverMod.size,
        status,
        localPath: localMod ? path.join(modsFolder, serverMod.fileName) : undefined,
        serverPath: serverMod.path,
        lastModified: serverMod.lastModified,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }

    // Check for local mods not on server
    for (const localMod of localMods) {
      const onServer = serverMods.some(
        (s) => s.fileName.toLowerCase() === localMod.fileName.toLowerCase()
      )
      if (!onServer) {
        mods.push({
          id: generateId(),
          serverId,
          name: this.getModDisplayName(localMod.fileName),
          fileName: localMod.fileName,
          localVersion: localMod.version,
          serverVersion: undefined,
          localHash: localMod.hash,
          serverHash: undefined,
          localSize: localMod.size,
          serverSize: undefined,
          status: 'NOVI',
          localPath: localMod.path,
          serverPath: undefined,
          lastModified: localMod.lastModified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }

    return mods
  }

  private saveModsToDb(serverId: string, mods: Mod[]): void {
    const db = getDb()
    db.prepare('DELETE FROM mods WHERE server_id = ?').run(serverId)

    const insert = db.prepare(`
      INSERT INTO mods (
        id, server_id, name, file_name, local_version, server_version,
        local_hash, server_hash, local_size, server_size, status,
        local_path, server_path, last_modified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = db.transaction((items: Mod[]) => {
      for (const mod of items) {
        insert.run(
          mod.id, mod.serverId, mod.name, mod.fileName,
          mod.localVersion ?? null, mod.serverVersion ?? null,
          mod.localHash ?? null, mod.serverHash ?? null,
          mod.localSize ?? null, mod.serverSize ?? null,
          mod.status,
          mod.localPath ?? null, mod.serverPath ?? null,
          mod.lastModified ?? null,
          mod.createdAt, mod.updatedAt
        )
      }
    })

    insertMany(mods)
  }

  private updateServerLastSync(serverId: string): void {
    const db = getDb()
    db.prepare(`
      UPDATE servers SET last_sync = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(serverId)
  }

  private async getUpdateStatus(serverId: string, serverMod: ServerMod, localMod: LocalMod): Promise<ModStatus> {
    const sha256 = firstNonEmpty(serverMod.sha256, isSha256(serverMod.hash) ? serverMod.hash : undefined)
    if (sha256) {
      const localHash = await this.calculateHash(localMod.path, 'sha256')
      const status: ModStatus = sameText(localHash, sha256) ? 'OK' : 'UPDATE'
      if (status === 'OK') this.setKnownHash(serverId, serverMod.fileName, sha256)
      return status
    }

    const crc32 = firstNonEmpty(serverMod.crc32, isCrc32(serverMod.hash) ? serverMod.hash : undefined)
    if (crc32) {
      const localCrc32 = await this.calculateCrc32(localMod.path)
      const status: ModStatus = sameText(localCrc32, crc32) ? 'OK' : 'UPDATE'
      if (status === 'OK') this.setKnownHash(serverId, serverMod.fileName, crc32)
      return status
    }

    if (serverMod.build && localMod.build && !sameText(serverMod.build, localMod.build)) {
      return 'UPDATE'
    }

    if (serverMod.version && localMod.version && normalizeVersion(serverMod.version) !== normalizeVersion(localMod.version)) {
      return 'UPDATE'
    }

    if (serverMod.size > 0 && localMod.size > 0 && serverMod.size !== localMod.size) {
      return 'UPDATE'
    }

    if (isUsableServerLastModified(serverMod) && !sameModifiedTime(serverMod.lastModified, localMod.lastModified)) {
      return 'UPDATE'
    }

    if (serverMod.hash) this.setKnownHash(serverId, serverMod.fileName, serverMod.hash)
    return 'OK'
  }

  /** Loads the last-known content hash for every tracked mod on a server. */
  private getKnownHashes(serverId: string): Map<string, string> {
    const db = getDb()
    const rows = db.prepare(
      'SELECT file_name, known_hash FROM mod_state WHERE server_id = ?'
    ).all(serverId) as { file_name: string; known_hash: string | null }[]

    const map = new Map<string, string>()
    for (const r of rows) {
      if (r.known_hash) map.set(r.file_name.toLowerCase(), r.known_hash)
    }
    return map
  }

  /** Records the server content hash that corresponds to the current local file. */
  setKnownHash(serverId: string, fileName: string, hash: string): void {
    if (!hash) return
    const db = getDb()
    db.prepare(`
      INSERT INTO mod_state (server_id, file_name, known_hash, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(server_id, file_name) DO UPDATE SET
        known_hash = excluded.known_hash, updated_at = excluded.updated_at
    `).run(serverId, fileName, hash)
  }

  async calculateHash(filePath: string, algo: 'sha256' | 'md5' = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algo)
      const stream = fs.createReadStream(filePath)
      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  async calculateCrc32(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let crc = 0xffffffff
      const stream = fs.createReadStream(filePath)
      stream.on('data', (data: string | Buffer) => {
        const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data)
        for (const byte of chunk) {
          crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff]
        }
      })
      stream.on('end', () => resolve(((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')))
      stream.on('error', reject)
    })
  }

  getModsFromDb(serverId: string): Mod[] {
    const db = getDb()
    const rows = db.prepare(`
      SELECT * FROM mods WHERE server_id = ?
      ORDER BY status, name
    `).all(serverId) as Record<string, unknown>[]

    return rows.map(this.rowToMod)
  }

  private rowToMod(row: Record<string, unknown>): Mod {
    return {
      id: row.id as string,
      serverId: row.server_id as string,
      name: row.name as string,
      fileName: row.file_name as string,
      localVersion: row.local_version as string | undefined,
      serverVersion: row.server_version as string | undefined,
      localHash: row.local_hash as string | undefined,
      serverHash: row.server_hash as string | undefined,
      localSize: row.local_size as number | undefined,
      serverSize: row.server_size as number | undefined,
      status: row.status as ModStatus,
      localPath: row.local_path as string | undefined,
      serverPath: row.server_path as string | undefined,
      lastModified: row.last_modified as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }
  }

  private extractVersionFromName(fileName: string): string {
    const match = fileName.match(/[_-]v?(\d+[\.\d]+)/i)
    return match ? match[1] : '1.0.0'
  }

  private getModDisplayName(fileName: string): string {
    return fileName.replace(/\.zip$/i, '').replace(/[_-]/g, ' ').trim()
  }
}

/**
 * Reads metadata from modDesc.xml inside an FS mod zip. The <version> is the
 * same value the dedicated server reports in its feed. The build value prefers
 * an explicit <build>, then falls back to descVersion from the root tag.
 * Streams only the single entry (memory-efficient for large mods).
 */
export function readModDescMetadata(zipPath: string): Promise<{ version?: string; build?: string }> {
  return new Promise((resolve) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return resolve({})
      let settled = false
      const finish = (metadata: { version?: string; build?: string } = {}): void => {
        if (settled) return
        settled = true
        try { zipfile.close() } catch { /* ignore */ }
        resolve(metadata)
      }
      zipfile.on('entry', (entry) => {
        if (entry.fileName.toLowerCase() === 'moddesc.xml') {
          zipfile.openReadStream(entry, (e, stream) => {
            if (e || !stream) return finish()
            let data = ''
            stream.on('data', (c: string | Buffer) => (data += c.toString('utf8')))
            stream.on('end', () => {
              const version = data.match(/<version>\s*([^<]+?)\s*<\/version>/i)?.[1]?.trim()
              const build = data.match(/<build>\s*([^<]+?)\s*<\/build>/i)?.[1]?.trim()
                || data.match(/<modDesc\b[^>]*\bdescVersion="([^"]+)"/i)?.[1]?.trim()
              finish({ version, build })
            })
            stream.on('error', () => finish())
          })
        } else {
          zipfile.readEntry()
        }
      })
      zipfile.on('end', () => finish())
      zipfile.on('error', () => finish())
      zipfile.readEntry()
    })
  })
}

export async function readModDescVersion(zipPath: string): Promise<string | undefined> {
  return (await readModDescMetadata(zipPath)).version
}

/** Normalizes an FS version string to 4 numeric parts for robust comparison. */
export function normalizeVersion(v?: string): string {
  if (!v) return ''
  const parts = v.trim().split('.').map((p) => parseInt(p, 10) || 0)
  while (parts.length < 4) parts.push(0)
  return parts.slice(0, 4).join('.')
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((v) => !!v && v.trim().length > 0)?.trim()
}

function sameText(a?: string, b?: string): boolean {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()
}

function isSha256(value?: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value || '')
}

function isCrc32(value?: string): boolean {
  return /^[a-f0-9]{8}$/i.test(value || '')
}

function isUsableServerLastModified(mod: ServerMod): boolean {
  if (!mod.lastModified || mod.size <= 0) return false
  return Number.isFinite(Date.parse(mod.lastModified))
}

function sameModifiedTime(serverValue?: string, localValue?: string): boolean {
  const serverTime = Date.parse(serverValue || '')
  const localTime = Date.parse(localValue || '')
  if (!Number.isFinite(serverTime) || !Number.isFinite(localTime)) return true
  return Math.abs(serverTime - localTime) <= 2000
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let c = index
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return c >>> 0
})

export const modSyncService = new ModSyncService()
