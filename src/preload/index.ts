import { contextBridge, ipcRenderer } from 'electron'
import type { IElectronAPI } from '../shared/types'

const api: IElectronAPI = {
  // App
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Auth
  discordLogin: () => ipcRenderer.invoke('auth:discord-login'),
  checkSession: () => ipcRenderer.invoke('auth:check-session'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkRole: (userId) => ipcRenderer.invoke('auth:check-role', userId),
  getUserLanguage: (userId) => ipcRenderer.invoke('auth:get-user-language', userId),
  saveUserLanguage: (userId, language) => ipcRenderer.invoke('auth:save-user-language', userId, language),

  // Servers
  getServers: () => ipcRenderer.invoke('servers:get-all'),
  addServer: (server) => ipcRenderer.invoke('servers:add', server),
  updateServer: (id, server) => ipcRenderer.invoke('servers:update', id, server),
  deleteServer: (id) => ipcRenderer.invoke('servers:delete', id),
  setActiveServer: (id) => ipcRenderer.invoke('servers:set-active', id),
  pingServer: (id) => ipcRenderer.invoke('servers:ping', id),
  getActiveServer: () => ipcRenderer.invoke('servers:get-active'),

  // Admin
  adminGetRoles: () => ipcRenderer.invoke('admin:get-roles'),
  adminGetConfig: () => ipcRenderer.invoke('admin:get-config'),
  adminSaveConfig: (config) => ipcRenderer.invoke('admin:save-config', config),

  // FS25 web panel
  panelGetState: (serverId) => ipcRenderer.invoke('panel:get-state', serverId),
  panelAction: (serverId, action) => ipcRenderer.invoke('panel:action', serverId, action),
  panelSaveMods: (serverId, activeModIds) => ipcRenderer.invoke('panel:save-mods', serverId, activeModIds),
  sowingTablesGet: () => ipcRenderer.invoke('sowing-tables:get'),
  sowingTableSave: (farmKey, rows, yearLabels) => ipcRenderer.invoke('sowing-tables:save', farmKey, rows, yearLabels),
  sowingTableRefresh: (farmKey) => ipcRenderer.invoke('sowing-tables:refresh', farmKey),

  // Mods
  getMods: (serverId) => ipcRenderer.invoke('mods:get-all', serverId),
  syncMods: (serverId) => ipcRenderer.invoke('mods:sync', serverId),
  syncAllMods: (serverId) => ipcRenderer.invoke('mods:sync-all', serverId),
  downloadMissing: (serverId) => ipcRenderer.invoke('mods:download-missing', serverId),
  updateAllMods: (serverId) => ipcRenderer.invoke('mods:update-all', serverId),
  deleteObsolete: (serverId) => ipcRenderer.invoke('mods:delete-obsolete', serverId),
  downloadMod: (modId) => ipcRenderer.invoke('mods:download-single', modId),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  selectFile: (filters) => ipcRenderer.invoke('settings:select-file', filters),
  selectFolder: () => ipcRenderer.invoke('settings:select-folder'),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('download:get-queue'),
  pauseDownload: (id) => ipcRenderer.invoke('download:pause', id),
  resumeDownload: (id) => ipcRenderer.invoke('download:resume', id),
  cancelDownload: (id) => ipcRenderer.invoke('download:cancel', id),

  // Uploads
  selectModFiles: () => ipcRenderer.invoke('upload:select-files'),
  uploadMods: (serverId, filePaths) => ipcRenderer.invoke('upload:enqueue', serverId, filePaths),
  getUploads: () => ipcRenderer.invoke('upload:get-queue'),
  cancelUpload: (id) => ipcRenderer.invoke('upload:cancel', id),
  clearFinishedUploads: () => ipcRenderer.invoke('upload:clear-finished'),

  // Logs
  getLogs: () => ipcRenderer.invoke('log:get-all'),
  clearLogs: () => ipcRenderer.invoke('log:clear'),

  // Game
  launchGame: (serverId) => ipcRenderer.invoke('game:launch', serverId),
  checkGameInstallation: () => ipcRenderer.invoke('game:check-installation'),

  // Launcher update
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  // Events
  on: (channel, callback) => {
    const allowedChannels = [
      'log:new-entry',
      'download:queue-update',
      'download:progress',
      'upload:queue-update',
      'upload:progress',
      'update:checking',
      'update:available',
      'update:not-available',
      'update:downloaded',
      'update:progress'
    ]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback as never)
  }
}

// Window controls exposed separately
contextBridge.exposeInMainWorld('electronWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized')
})

contextBridge.exposeInMainWorld('electron', api)
