import SftpClient from 'ssh2-sftp-client'
import type { GameServer, ServerMod } from '../../src/shared/types'
import { logService } from './log.service'
import { resolveHost } from './net-util'

export class SFTPService {
  async listMods(server: GameServer): Promise<ServerMod[]> {
    const sftp = new SftpClient()

    try {
      await sftp.connect({
        host: resolveHost(server.sftpHost, server.ip),
        port: server.sftpPort || 22,
        username: server.sftpUsername,
        password: server.sftpPassword,
        readyTimeout: 10000
      })

      const remotePath = server.sftpPath || '/mods'
      const fileList = await sftp.list(remotePath)
      const mods: ServerMod[] = []

      for (const file of fileList) {
        if (file.type === 'd') continue
        if (!file.name.endsWith('.zip') && !file.name.endsWith('.ZIP')) continue

        mods.push({
          fileName: file.name,
          version: this.extractVersionFromName(file.name),
          hash: '',
          size: file.size || 0,
          path: `${remotePath}/${file.name}`,
          lastModified: new Date(file.modifyTime).toISOString()
        })
      }

      logService.success('SFTP', `Učitano ${mods.length} modova s SFTP servera ${server.name}`)
      return mods
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nepoznata greška'
      logService.error('SFTP', `Greška pri SFTP spajanju: ${msg}`)
      throw new Error(`SFTP greška: ${msg}`)
    } finally {
      await sftp.end()
    }
  }

  async downloadFile(
    server: GameServer,
    remotePath: string,
    localPath: string,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<void> {
    const sftp = new SftpClient()

    try {
      await sftp.connect({
        host: resolveHost(server.sftpHost, server.ip),
        port: server.sftpPort || 22,
        username: server.sftpUsername,
        password: server.sftpPassword,
        readyTimeout: 10000
      })

      await sftp.fastGet(remotePath, localPath, {
        step: (transferred, chunk, total) => {
          if (onProgress) onProgress(transferred, total)
        },
        concurrency: 64,
        chunkSize: 32768
      })
    } finally {
      await sftp.end()
    }
  }

  async uploadFile(
    server: GameServer,
    localPath: string,
    remoteFileName: string,
    onProgress?: (uploaded: number, total: number) => void
  ): Promise<void> {
    const sftp = new SftpClient()
    try {
      await sftp.connect({
        host: resolveHost(server.sftpHost, server.ip),
        port: server.sftpPort || 22,
        username: server.sftpUsername,
        password: server.sftpPassword,
        readyTimeout: 10000
      })
      const remoteDir = server.sftpPath || '/mods'
      if (!(await sftp.exists(remoteDir))) await sftp.mkdir(remoteDir, true)
      const remotePath = `${remoteDir.replace(/\/$/, '')}/${remoteFileName}`
      await sftp.fastPut(localPath, remotePath, {
        step: (transferred, _chunk, total) => {
          if (onProgress) onProgress(transferred, total)
        },
        concurrency: 64,
        chunkSize: 32768
      })
    } finally {
      await sftp.end()
    }
  }

  async testConnection(server: GameServer): Promise<boolean> {
    const sftp = new SftpClient()

    try {
      await sftp.connect({
        host: resolveHost(server.sftpHost, server.ip),
        port: server.sftpPort || 22,
        username: server.sftpUsername,
        password: server.sftpPassword,
        readyTimeout: 5000
      })
      return true
    } catch {
      return false
    } finally {
      await sftp.end()
    }
  }

  private extractVersionFromName(fileName: string): string {
    const match = fileName.match(/[_-]v?(\d+[\.\d]+)/i)
    return match ? match[1] : '1.0.0'
  }
}

export const sftpService = new SFTPService()
