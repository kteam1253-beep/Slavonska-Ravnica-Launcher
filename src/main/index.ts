import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { initDatabase } from '../../database/database'
import { registerAllHandlers } from './ipc'
import { logService } from '../../backend/services/log.service'
import { createMainWindow } from './window'
import { initUpdater } from '../../updater'

// Handle single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(async () => {
  // Initialize database
  try {
    initDatabase()
    logService.success('APP', 'SR Launcher V2 pokrenut')
  } catch (err) {
    console.error('Database init failed:', err)
  }

  // Register all IPC handlers
  registerAllHandlers()

  // Create main window
  const win = createMainWindow()

  // Initialize auto updater
  initUpdater(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  logService.info('APP', 'SR Launcher V2 zatvoren')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
