import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import crypto from 'crypto'

let db: Database.Database

export function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'sr-launcher.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  createSchema()
  runMigrations()
  seedDefaultSettings()

  return db
}

/**
 * Idempotent migrations for existing databases. ALTER TABLE ADD COLUMN throws
 * if the column already exists, so each is wrapped in try/catch.
 */
function runMigrations(): void {
  const columns: [string, string][] = [
    ['web_stats_port', 'INTEGER DEFAULT 8080'],
    ['web_api_code', "TEXT DEFAULT ''"],
    ['web_admin_username', "TEXT DEFAULT ''"],
    ['web_admin_password', "TEXT DEFAULT ''"]
  ]
  for (const [name, def] of columns) {
    try {
      db.exec(`ALTER TABLE servers ADD COLUMN ${name} ${def}`)
    } catch {
      // Column already exists - ignore
    }
  }
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

function createSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT DEFAULT '',
      port INTEGER DEFAULT 7777,
      status TEXT DEFAULT 'unknown',
      players INTEGER DEFAULT 0,
      max_players INTEGER DEFAULT 16,
      map TEXT DEFAULT '',
      version TEXT DEFAULT '',
      ping INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      connection_type TEXT DEFAULT 'ftp',
      ftp_host TEXT DEFAULT '',
      ftp_port INTEGER DEFAULT 21,
      ftp_username TEXT DEFAULT '',
      ftp_password TEXT DEFAULT '',
      ftp_path TEXT DEFAULT '/mods',
      sftp_host TEXT DEFAULT '',
      sftp_port INTEGER DEFAULT 22,
      sftp_username TEXT DEFAULT '',
      sftp_password TEXT DEFAULT '',
      sftp_path TEXT DEFAULT '/mods',
      api_url TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      web_stats_port INTEGER DEFAULT 8080,
      web_api_code TEXT DEFAULT '',
      web_admin_username TEXT DEFAULT '',
      web_admin_password TEXT DEFAULT '',
      last_sync TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mods (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      local_version TEXT DEFAULT NULL,
      server_version TEXT DEFAULT NULL,
      local_hash TEXT DEFAULT NULL,
      server_hash TEXT DEFAULT NULL,
      local_size INTEGER DEFAULT 0,
      server_size INTEGER DEFAULT 0,
      status TEXT DEFAULT 'FALI',
      local_path TEXT DEFAULT NULL,
      server_path TEXT DEFAULT NULL,
      last_modified TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('info', 'success', 'warning', 'error')),
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Tracks the last-known server content hash per mod, so we can detect when a
    -- mod's content changes on the server (even if its version number stays the same).
    CREATE TABLE IF NOT EXISTS mod_state (
      server_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      known_hash TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (server_id, file_name)
    );

    CREATE TABLE IF NOT EXISTS auth_session (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      user_id TEXT,
      username TEXT,
      discriminator TEXT,
      avatar TEXT,
      email TEXT,
      global_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER DEFAULT 0,
      has_required_role INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- UI preferences are scoped to the Discord account, not to a shared app setting.
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      language TEXT NOT NULL DEFAULT 'hr' CHECK(language IN ('hr', 'en', 'de', 'fr')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      mod_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      server_id TEXT NOT NULL,
      total_size INTEGER DEFAULT 0,
      downloaded_size INTEGER DEFAULT 0,
      speed INTEGER DEFAULT 0,
      eta INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      progress REAL DEFAULT 0,
      error TEXT DEFAULT NULL,
      started_at TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mods_server_id ON mods(server_id);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
  `)
}

function seedDefaultSettings(): void {
  const defaults: Record<string, string> = {
    fs_exe_path: '',
    mods_folder: '',
    discord_client_id: '',
    discord_client_secret: '',
    discord_guild_id: '',
    discord_bot_token: '',
    discord_required_role_id: '',
    discord_required_role_name: 'SR Member',
    auto_update_launcher: 'true',
    auto_update_mods: 'false',
    launch_with_windows: 'false'
  }

  const insert = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )

  const insertMany = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      insert.run(key, value)
    }
  })

  insertMany(Object.entries(defaults))
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
