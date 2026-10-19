import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'

const isDev = !app.isPackaged

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    title: 'SR Launcher V2 - Slavonska Ravnica',
    backgroundColor: '#0a0a0a',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    show: false,
    icon: join(__dirname, '../../assets/icons/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  // Handle external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
