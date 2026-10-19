import { ipcMain, BrowserWindow } from 'electron'

export function registerWindowHandlers(): void {
  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  ipcMain.handle('window:is-maximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false
  })
}
