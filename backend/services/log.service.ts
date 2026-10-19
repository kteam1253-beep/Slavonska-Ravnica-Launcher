import { getDb, generateId } from '../../database/database'
import type { LogEntry, LogLevel } from '../../src/shared/types'
import { BrowserWindow } from 'electron'

class LogService {
  private push(level: LogLevel, category: string, message: string): void {
    try {
      const db = getDb()
      const id = generateId()
      const timestamp = new Date().toISOString()

      db.prepare(`
        INSERT INTO logs (id, timestamp, level, category, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, timestamp, level, category, message)

      // Push to renderer
      const entry: LogEntry = { id, timestamp, level, category, message }
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('log:new-entry', entry)
      })
    } catch {
      // Ignore if DB not ready yet
    }
  }

  info(category: string, message: string): void {
    console.log(`[${category}] ${message}`)
    this.push('info', category, message)
  }

  success(category: string, message: string): void {
    console.log(`✓ [${category}] ${message}`)
    this.push('success', category, message)
  }

  warning(category: string, message: string): void {
    console.warn(`⚠ [${category}] ${message}`)
    this.push('warning', category, message)
  }

  error(category: string, message: string): void {
    console.error(`✗ [${category}] ${message}`)
    this.push('error', category, message)
  }

  getAll(): LogEntry[] {
    try {
      const db = getDb()
      return db.prepare(`
        SELECT id, timestamp, level, category, message
        FROM logs
        ORDER BY timestamp DESC
        LIMIT 500
      `).all() as LogEntry[]
    } catch {
      return []
    }
  }

  clear(): void {
    const db = getDb()
    db.prepare('DELETE FROM logs').run()
  }
}

export const logService = new LogService()
