import { getDb } from '../../database/database'
import type { AppSettings } from '../../src/shared/types'

const DB_TO_SETTINGS_MAP: Record<string, keyof AppSettings> = {
  fs_exe_path: 'fsExePath',
  mods_folder: 'modsFolder',
  discord_client_id: 'discordClientId',
  discord_client_secret: 'discordClientSecret',
  discord_guild_id: 'discordGuildId',
  discord_bot_token: 'discordBotToken',
  discord_required_role_id: 'discordRequiredRoleId',
  discord_required_role_name: 'discordRequiredRoleName',
  auto_update_launcher: 'autoUpdateLauncher',
  auto_update_mods: 'autoUpdateMods',
  launch_with_windows: 'launchWithWindows',
  ftp_timeout: 'ftpTimeout'
}

const SETTINGS_TO_DB_MAP: Record<string, string> = {}
for (const [k, v] of Object.entries(DB_TO_SETTINGS_MAP)) {
  SETTINGS_TO_DB_MAP[v] = k
}

export function getSettings(): AppSettings {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]

  const settings: AppSettings = {
    fsExePath: '',
    modsFolder: '',
    discordClientId: '',
    discordClientSecret: '',
    discordGuildId: '',
    discordBotToken: '',
    discordRequiredRoleId: '',
    discordRequiredRoleName: 'SR Member',
    autoUpdateLauncher: true,
    autoUpdateMods: false,
    launchWithWindows: false,
    ftpTimeout: 60000
  }

  for (const row of rows) {
    const settingKey = DB_TO_SETTINGS_MAP[row.key]
    if (!settingKey) continue

    if (settingKey === 'autoUpdateLauncher' || settingKey === 'autoUpdateMods' || settingKey === 'launchWithWindows') {
      settings[settingKey] = row.value === 'true'
    } else if (settingKey === 'ftpTimeout') {
      settings[settingKey] = parseInt(row.value, 10) || 60000
    } else {
      (settings as Record<string, unknown>)[settingKey] = row.value
    }
  }

  return settings
}

export function saveSettings(partial: Partial<AppSettings>): void {
  const db = getDb()
  const update = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `)

  const updateMany = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      update.run(key, value)
    }
  })

  const entries: [string, string][] = []
  for (const [settingKey, value] of Object.entries(partial)) {
    const dbKey = SETTINGS_TO_DB_MAP[settingKey]
    if (!dbKey) continue
    entries.push([dbKey, String(value)])
  }

  if (entries.length > 0) {
    updateMany(entries)
  }
}
