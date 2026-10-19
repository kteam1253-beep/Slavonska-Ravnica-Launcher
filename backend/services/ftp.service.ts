import fs from 'fs'
import { Client, FTPResponse } from 'basic-ftp'
import type { GameServer, ServerMod } from '../../src/shared/types'
import { logService } from './log.service'
import { resolveHost } from './net-util'
import { getSettings } from './settings.service'

export class FTPService {
  async listMods(server: GameServer): Promise<ServerMod[]> {
    const client = new Client()
    client.ftp.verbose = false

    try {
      await client.access({
        host: resolveHost(server.ftpHost, server.ip),
        port: server.ftpPort || 21,
        user: server.ftpUsername,
        password: server.ftpPassword,
        secure: false
      })

      const remotePath = server.ftpPath || '/mods'
      await client.cd(remotePath)

      const fileList = await client.list()
      const mods: ServerMod[] = []

      for (const file of fileList) {
        if (file.isDirectory) continue
        if (!file.name.endsWith('.zip') && !file.name.endsWith('.ZIP')) continue

        mods.push({
          fileName: file.name,
          version: this.extractVersionFromName(file.name),
          hash: '',
          size: file.size || 0,
          path: `${remotePath}/${file.name}`,
          lastModified: file.modifiedAt?.toISOString() || new Date().toISOString()
        })
      }

      logService.success('FTP', `Učitano ${mods.length} modova s FTP servera ${server.name}`)
      return mods
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nepoznata greška'
      logService.error('FTP', `Greška pri spajanju na FTP: ${msg}`)
      throw new Error(`FTP greška: ${msg}`)
    } finally {
      client.close()
    }
  }

  async downloadFile(
    server: GameServer,
    remotePath: string,
    localPath: string,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<void> {
    const client = new Client()
    client.ftp.verbose = false

    try {
      await client.access({
        host: resolveHost(server.ftpHost, server.ip),
        port: server.ftpPort || 21,
        user: server.ftpUsername,
        password: server.ftpPassword,
        secure: false
      })

      client.trackProgress((info) => {
        if (onProgress) {
          onProgress(info.bytes, info.bytesOverall)
        }
      })

      await client.downloadTo(localPath, remotePath)
    } finally {
      client.trackProgress()
      client.close()
    }
  }

  async uploadFile(
    server: GameServer,
    localPath: string,
    remoteFileName: string,
    onProgress?: (uploaded: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const client = new Client()
    client.ftp.verbose = false
    client.ftp.timeout = getSettings().ftpTimeout || 60000

    const total = fs.statSync(localPath).size
    const onAbort = (): void => client.close()
    if (signal) signal.addEventListener('abort', onAbort)

    try {
      await client.access({
        host: resolveHost(server.ftpHost, server.ip),
        port: server.ftpPort || 21,
        user: server.ftpUsername,
        password: server.ftpPassword,
        secure: false
      })

      // ensureDir creates the mods folder if missing and changes into it
      const remoteDir = server.ftpPath || '/mods'
      await client.ensureDir(remoteDir)

      client.trackProgress((info) => {
        if (onProgress) onProgress(info.bytes, total)
      })

      await client.uploadFrom(localPath, remoteFileName)
    } finally {
      client.trackProgress()
      if (signal) signal.removeEventListener('abort', onAbort)
      client.close()
    }
  }

  async testConnection(server: GameServer): Promise<boolean> {
    const client = new Client()
    client.ftp.verbose = false

    try {
      await client.access({
        host: resolveHost(server.ftpHost, server.ip),
        port: server.ftpPort || 21,
        user: server.ftpUsername,
        password: server.ftpPassword,
        secure: false
      })
      return true
    } catch {
      return false
    } finally {
      client.close()
    }
  }

  private extractVersionFromName(fileName: string): string {
    const match = fileName.match(/[_-]v?(\d+[\.\d]+)/i)
    return match ? match[1] : '1.0.0'
  }
}

export const ftpService = new FTPService()
