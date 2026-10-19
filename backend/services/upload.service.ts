import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'
import { generateId } from '../../database/database'
import { ftpService } from './ftp.service'
import { sftpService } from './sftp.service'
import { logService } from './log.service'
import { discordService } from './discord.service'
import { backendAuthService } from './backend-auth.service'
import { getSettings } from './settings.service'
import { isBackendMode } from '../../src/shared/app-config'
import type { GameServer, UploadItem } from '../../src/shared/types'

const DISCORD_MOD_CHANNEL_ID = '1487478328007987471'

/**
 * Sequential (one-by-one) upload queue for pushing mods to the server over FTP/SFTP.
 * Admin feature — uses the server's FTP credentials. Streams at full speed.
 */
export class UploadService {
  private queue: UploadItem[] = []
  private activeController: AbortController | null = null
  private processing = false

  enqueue(server: GameServer, filePaths: string[]): UploadItem[] {
    for (const fp of filePaths) {
      if (!fs.existsSync(fp)) continue
      const stat = fs.statSync(fp)
      this.queue.push({
        id: generateId(),
        fileName: path.basename(fp),
        localPath: fp,
        serverId: server.id,
        totalSize: stat.size,
        uploadedSize: 0,
        speed: 0,
        eta: 0,
        status: 'pending',
        progress: 0,
        startedAt: new Date().toISOString()
      })
    }
    this.broadcastQueue()
    void this.processQueue(server)
    return this.getQueue()
  }

  private async processQueue(server: GameServer): Promise<void> {
    if (this.processing) return
    this.processing = true
    try {
      // Strictly one at a time, in order
      for (;;) {
        const next = this.queue.find((i) => i.status === 'pending')
        if (!next) break
        await this.executeUpload(next, server)
      }
    } finally {
      this.processing = false
    }
  }

  private async executeUpload(item: UploadItem, server: GameServer): Promise<void> {
    item.status = 'uploading'
    this.broadcastQueue()
    logService.info('UPLOAD', `Upload: ${item.fileName}`)

    const controller = new AbortController()
    this.activeController = controller

    let lastBytes = 0
    let lastTime = Date.now()

    try {
      const uploadFn =
        server.connectionType === 'sftp'
          ? sftpService.uploadFile.bind(sftpService)
          : ftpService.uploadFile.bind(ftpService)

      await uploadFn(
        server,
        item.localPath,
        item.fileName,
        (uploaded: number, total: number) => {
          item.uploadedSize = uploaded
          if (total > 0) item.totalSize = total
          item.progress = item.totalSize > 0 ? (uploaded / item.totalSize) * 100 : 0

          const now = Date.now()
          const dt = (now - lastTime) / 1000
          if (dt >= 0.4) {
            item.speed = (uploaded - lastBytes) / dt
            item.eta = item.speed > 0 ? (item.totalSize - uploaded) / item.speed : 0
            lastBytes = uploaded
            lastTime = now
            this.broadcastProgress(item)
          }
        },
        controller.signal
      )

      item.status = 'completed'
      item.progress = 100
      item.uploadedSize = item.totalSize
      item.speed = 0
      item.completedAt = new Date().toISOString()
      logService.success('UPLOAD', `Uploadan: ${item.fileName}`)
      await this.notifyDiscord(item, server)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška pri uploadu'
      if (controller.signal.aborted) {
        item.status = 'cancelled'
        logService.warning('UPLOAD', `Otkazan upload: ${item.fileName}`)
      } else {
        item.status = 'error'
        item.error = msg
        logService.error('UPLOAD', `Greška upload ${item.fileName}: ${msg}`)
      }
    } finally {
      this.activeController = null
      this.broadcastQueue()
    }
  }

  private async notifyDiscord(item: UploadItem, server: GameServer): Promise<void> {
    try {
      const session = discordService.loadSession()
      if (!session) throw new Error('Discord sesija nije pronađena')

      if (isBackendMode()) {
        await backendAuthService.notifyModUpload(session.user.accessToken, {
          fileName: item.fileName,
          serverName: server.name,
          size: item.totalSize
        })
      } else {
        const settings = getSettings()
        await discordService.sendModUploadNotification(
          settings.discordBotToken,
          DISCORD_MOD_CHANNEL_ID,
          {
            fileName: item.fileName,
            serverName: server.name,
            size: item.totalSize,
            uploadedBy: session.user.globalName || session.user.username
          }
        )
      }
      logService.success('DISCORD', `Obavijest poslana za: ${item.fileName}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nepoznata greška'
      // Discord must never turn a completed FTP/SFTP upload into a failed upload.
      logService.warning('DISCORD', `Mod je uploadan, ali obavijest nije poslana: ${msg}`)
    }
  }

  cancel(id: string): void {
    const item = this.queue.find((i) => i.id === id)
    if (!item) return
    if (item.status === 'uploading' && this.activeController) {
      this.activeController.abort()
    } else if (item.status === 'pending') {
      item.status = 'cancelled'
      this.broadcastQueue()
    }
  }

  clearFinished(): void {
    this.queue = this.queue.filter((i) => i.status === 'uploading' || i.status === 'pending')
    this.broadcastQueue()
  }

  getQueue(): UploadItem[] {
    return [...this.queue]
  }

  private broadcastQueue(): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('upload:queue-update', this.queue)
    })
  }

  private broadcastProgress(item: UploadItem): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('upload:progress', item)
    })
  }
}

export const uploadService = new UploadService()
