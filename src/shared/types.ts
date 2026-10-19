// ============================================================
// SERVER TYPES
// ============================================================

export type ConnectionType = 'ftp' | 'sftp' | 'rest'
export type ServerStatus = 'online' | 'offline' | 'unknown'

export interface GameServer {
  id: string
  name: string
  ip: string
  port: number
  status: ServerStatus
  players: number
  maxPlayers: number
  map: string
  version: string
  ping: number
  isActive: boolean
  connectionType: ConnectionType
  // FTP
  ftpHost?: string
  ftpPort?: number
  ftpUsername?: string
  ftpPassword?: string
  ftpPath?: string
  // SFTP
  sftpHost?: string
  sftpPort?: number
  sftpUsername?: string
  sftpPassword?: string
  sftpPath?: string
  // REST API
  apiUrl?: string
  apiKey?: string
  // FS25 Web Stats (dedicated server web panel) - live players/map/version
  webStatsPort?: number
  webApiCode?: string
  webAdminUsername?: string
  webAdminPassword?: string
  lastSync?: string
  createdAt: string
  updatedAt: string
}

export interface ServerPingResult {
  online: boolean
  ping: number
  players?: number
  maxPlayers?: number
  map?: string
  version?: string
}

export type FsPanelStatus = 'running' | 'stopped' | 'unknown'

export interface FsPanelMod {
  id: string
  name: string
  active: boolean
}

export interface FsPanelState {
  configured: boolean
  status: FsPanelStatus
  mods: FsPanelMod[]
}

export interface SowingTableRow {
  field: string
  year1: string
  year2: string
  year3: string
  year4: string
}

export interface SowingTableFarm {
  key: string
  label: string
  channelId: string
  messageId: string | null
  yearLabels: string[]
  rows: SowingTableRow[]
}

export interface SowingTablesState {
  farms: SowingTableFarm[]
}

// ============================================================
// MOD TYPES
// ============================================================

export type ModStatus = 'OK' | 'UPDATE' | 'NOVI' | 'FALI' | 'GREŠKA'

export interface Mod {
  id: string
  serverId: string
  name: string
  fileName: string
  localVersion?: string
  serverVersion?: string
  localHash?: string
  serverHash?: string
  localSize?: number
  serverSize?: number
  status: ModStatus
  localPath?: string
  serverPath?: string
  lastModified?: string
  createdAt: string
  updatedAt: string
}

export interface ServerMod {
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

export interface LocalMod {
  fileName: string
  version?: string
  build?: string
  hash: string
  size: number
  path: string
  lastModified: string
}

export interface SyncResult {
  total: number
  ok: number
  missing: number
  updates: number
  newMods: number
  errors: number
  mods: Mod[]
}

// ============================================================
// AUTH TYPES
// ============================================================

export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar?: string
  email?: string
  globalName?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export type AppLanguage = 'hr' | 'en' | 'de' | 'fr'

export interface GuildMember {
  userId: string
  roles: string[]
  nick?: string
  joinedAt: string
}

// ============================================================
// SETTINGS TYPES
// ============================================================

export interface AppSettings {
  // Farming Simulator
  fsExePath: string
  modsFolder: string

  // Discord
  discordClientId: string
  discordClientSecret: string
  discordGuildId: string
  discordBotToken: string
  discordRequiredRoleId: string
  discordRequiredRoleName: string

  // Auto Update
  autoUpdateLauncher: boolean
  autoUpdateMods: boolean
  launchWithWindows: boolean

  // FTP Upload
  ftpTimeout: number
}

// ============================================================
// LOG TYPES
// ============================================================

export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: string
  message: string
}

// ============================================================
// DOWNLOAD TYPES
// ============================================================

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'verifying'

export interface DownloadItem {
  id: string
  modId: string
  fileName: string
  serverId: string
  totalSize: number
  downloadedSize: number
  speed: number
  eta: number
  status: DownloadStatus
  progress: number
  error?: string
  startedAt?: string
  completedAt?: string
}

export interface DownloadProgress {
  id: string
  downloadedSize: number
  totalSize: number
  speed: number
  eta: number
  progress: number
  status: DownloadStatus
}

export interface GuildRole {
  id: string
  name: string
  color: number
}

export interface RoleConfig {
  accessRoleIds: string[]
  uploadRoleIds: string[]
}

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled'

export interface UploadItem {
  id: string
  fileName: string
  localPath: string
  serverId: string
  totalSize: number
  uploadedSize: number
  speed: number
  eta: number
  status: UploadStatus
  progress: number
  error?: string
  startedAt?: string
  completedAt?: string
}

// ============================================================
// IPC TYPES
// ============================================================

export interface IPCResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface IElectronAPI {
  // App
  getAppVersion: () => Promise<string>

  // Auth
  discordLogin: () => Promise<IPCResponse<DiscordUser>>
  checkSession: () => Promise<IPCResponse<{ user: DiscordUser; hasRole: boolean; canUpload?: boolean } | null>>
  logout: () => Promise<IPCResponse>
  checkRole: (userId: string) => Promise<IPCResponse<boolean>>
  getUserLanguage: (userId: string) => Promise<IPCResponse<AppLanguage>>
  saveUserLanguage: (userId: string, language: AppLanguage) => Promise<IPCResponse<AppLanguage>>

  // Admin (role management - backend mode)
  adminGetRoles: () => Promise<IPCResponse<GuildRole[]>>
  adminGetConfig: () => Promise<IPCResponse<RoleConfig>>
  adminSaveConfig: (config: RoleConfig) => Promise<IPCResponse<RoleConfig>>

  // FS25 dedicated server web panel (admin only)
  panelGetState: (serverId: string) => Promise<IPCResponse<FsPanelState>>
  panelAction: (serverId: string, action: 'start' | 'stop' | 'restart') => Promise<IPCResponse>
  panelSaveMods: (serverId: string, activeModIds: string[]) => Promise<IPCResponse>
  sowingTablesGet: () => Promise<IPCResponse<SowingTablesState>>
  sowingTableSave: (farmKey: string, rows: SowingTableRow[], yearLabels: string[]) => Promise<IPCResponse<SowingTablesState>>
  sowingTableRefresh: (farmKey: string) => Promise<IPCResponse<SowingTablesState>>

  // Servers
  getServers: () => Promise<IPCResponse<GameServer[]>>
  addServer: (server: Omit<GameServer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<IPCResponse<GameServer>>
  updateServer: (id: string, server: Partial<GameServer>) => Promise<IPCResponse<GameServer>>
  deleteServer: (id: string) => Promise<IPCResponse>
  setActiveServer: (id: string) => Promise<IPCResponse>
  pingServer: (id: string) => Promise<IPCResponse<ServerPingResult>>
  getActiveServer: () => Promise<IPCResponse<GameServer | null>>

  // Mods
  getMods: (serverId: string) => Promise<IPCResponse<Mod[]>>
  syncMods: (serverId: string) => Promise<IPCResponse<SyncResult>>
  syncAllMods: (serverId: string) => Promise<IPCResponse<SyncResult>>
  downloadMissing: (serverId: string) => Promise<IPCResponse>
  updateAllMods: (serverId: string) => Promise<IPCResponse>
  deleteObsolete: (serverId: string) => Promise<IPCResponse>
  downloadMod: (modId: string) => Promise<IPCResponse>

  // Settings
  getSettings: () => Promise<IPCResponse<AppSettings>>
  saveSettings: (settings: Partial<AppSettings>) => Promise<IPCResponse>
  selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<IPCResponse<string | null>>
  selectFolder: () => Promise<IPCResponse<string | null>>

  // Downloads
  getDownloads: () => Promise<IPCResponse<DownloadItem[]>>
  pauseDownload: (id: string) => Promise<IPCResponse>
  resumeDownload: (id: string) => Promise<IPCResponse>
  cancelDownload: (id: string) => Promise<IPCResponse>

  // Uploads (admin - FTP upload to server)
  selectModFiles: () => Promise<IPCResponse<string[]>>
  uploadMods: (serverId: string, filePaths: string[]) => Promise<IPCResponse>
  getUploads: () => Promise<IPCResponse<UploadItem[]>>
  cancelUpload: (id: string) => Promise<IPCResponse>
  clearFinishedUploads: () => Promise<IPCResponse>

  // Logs
  getLogs: () => Promise<IPCResponse<LogEntry[]>>
  clearLogs: () => Promise<IPCResponse>

  // Game
  launchGame: (serverId: string) => Promise<IPCResponse>
  checkGameInstallation: () => Promise<IPCResponse<boolean>>

  // Launcher update
  downloadUpdate: () => Promise<unknown>
  installUpdate: () => Promise<void>

  // Events
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
}

// Extend the Window interface
declare global {
  interface Window {
    electron: IElectronAPI
  }
}
