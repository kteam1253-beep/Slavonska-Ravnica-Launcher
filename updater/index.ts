import { app, ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { logService } from '../backend/services/log.service'

export function initUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('updater:download', async () => {
    logService.info('UPDATER', 'Korisnik je pokrenuo preuzimanje update-a')
    return autoUpdater.downloadUpdate()
  })
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(true, true)
  })

  autoUpdater.on('checking-for-update', () => {
    logService.info('UPDATER', `Provjera azuriranja launchera (${app.getVersion()})...`)
    win.webContents.send('update:checking')
  })

  autoUpdater.on('update-available', async (info) => {
    logService.info('UPDATER', `Dostupna nova verzija: ${info.version}`)
    win.webContents.send('update:available', info)
  })

  autoUpdater.on('update-not-available', () => {
    logService.success('UPDATER', 'Koristite najnoviju verziju launchera')
    win.webContents.send('update:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('update:progress', progress)
  })

  autoUpdater.on('update-downloaded', async (info) => {
    logService.success('UPDATER', `Azuriranje preuzeto: ${info.version}. Restart za instalaciju.`)
    win.webContents.send('update:downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    logService.warning('UPDATER', `Greska provjere azuriranja: ${err.message}`)
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Ignore update check errors in dev mode or unpacked builds.
    })
  }, 5000)
}
