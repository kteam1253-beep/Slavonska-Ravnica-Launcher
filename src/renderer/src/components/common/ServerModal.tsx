import React, { useState } from 'react'
import { useServerStore } from '../../store/server.store'
import type { GameServer } from '../../../../../shared/types'

interface ServerModalProps {
  server: GameServer | null
  onClose: () => void
  onSave: () => void
}

type ConnectionType = 'ftp' | 'sftp' | 'rest'

const defaultData: Omit<GameServer, 'id' | 'status' | 'players' | 'ping' | 'createdAt' | 'updatedAt'> = {
  name: '',
  ip: '',
  port: 7777,
  maxPlayers: 16,
  map: '',
  version: '',
  isActive: false,
  connectionType: 'ftp',
  ftpHost: '',
  ftpPort: 21,
  ftpUsername: '',
  ftpPassword: '',
  ftpPath: '/mods',
  sftpHost: '',
  sftpPort: 22,
  sftpUsername: '',
  sftpPassword: '',
  sftpPath: '/mods',
  apiUrl: '',
  apiKey: '',
  webStatsPort: 8080,
  webApiCode: '',
  webAdminUsername: '',
  webAdminPassword: ''
}

export default function ServerModal({ server, onClose, onSave }: ServerModalProps): React.ReactElement {
  const { addServer, updateServer } = useServerStore()
  const [form, setForm] = useState<typeof defaultData>(
    server ? {
      name: server.name,
      ip: server.ip,
      port: server.port,
      maxPlayers: server.maxPlayers,
      map: server.map,
      version: server.version,
      isActive: server.isActive,
      connectionType: server.connectionType,
      ftpHost: server.ftpHost || '',
      ftpPort: server.ftpPort || 21,
      ftpUsername: server.ftpUsername || '',
      ftpPassword: server.ftpPassword || '',
      ftpPath: server.ftpPath || '/mods',
      sftpHost: server.sftpHost || '',
      sftpPort: server.sftpPort || 22,
      sftpUsername: server.sftpUsername || '',
      sftpPassword: server.sftpPassword || '',
      sftpPath: server.sftpPath || '/mods',
      apiUrl: server.apiUrl || '',
      apiKey: server.apiKey || '',
      webStatsPort: server.webStatsPort || 8080,
      webApiCode: server.webApiCode || '',
      webAdminUsername: server.webAdminUsername || '',
      webAdminPassword: server.webAdminPassword || ''
    } : defaultData
  )
  const [isSaving, setIsSaving] = useState(false)

  const update = (key: keyof typeof defaultData, value: unknown): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) return
    setIsSaving(true)
    try {
      if (server) {
        await updateServer(server.id, form)
      } else {
        await addServer({ ...form, status: 'unknown', players: 0, ping: 0 })
      }
      onSave()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="panel w-full max-w-lg max-h-[90vh] flex flex-col"
           style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-dark-400 flex items-center justify-between">
          <h2 className="text-white font-semibold">{server ? 'Uredi Server' : 'Dodaj Server'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Naziv Servera *</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Slavonska Ravnica - Server 1"
              className="input-dark"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">IP Adresa</label>
              <input
                value={form.ip}
                onChange={(e) => update('ip', e.target.value)}
                placeholder="0.0.0.0"
                className="input-dark font-mono"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Port (Igra)</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => update('port', parseInt(e.target.value) || 7777)}
                className="input-dark font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Tip veze za modove</label>
            <select
              value={form.connectionType}
              onChange={(e) => update('connectionType', e.target.value as ConnectionType)}
              className="select-dark"
            >
              <option value="ftp">FTP</option>
              <option value="sftp">SFTP</option>
              <option value="rest">REST API</option>
            </select>
          </div>

          {/* FTP fields */}
          {form.connectionType === 'ftp' && (
            <ConnectionFields
              prefix="ftp"
              host={form.ftpHost || ''}
              port={form.ftpPort || 21}
              username={form.ftpUsername || ''}
              password={form.ftpPassword || ''}
              path={form.ftpPath || '/mods'}
              onUpdate={update}
            />
          )}

          {/* SFTP fields */}
          {form.connectionType === 'sftp' && (
            <ConnectionFields
              prefix="sftp"
              host={form.sftpHost || ''}
              port={form.sftpPort || 22}
              username={form.sftpUsername || ''}
              password={form.sftpPassword || ''}
              path={form.sftpPath || '/mods'}
              onUpdate={update}
            />
          )}

          {/* REST API fields */}
          {form.connectionType === 'rest' && (
            <>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">API URL</label>
                <input
                  value={form.apiUrl}
                  onChange={(e) => update('apiUrl', e.target.value)}
                  placeholder="https://api.server.com"
                  className="input-dark font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">API Key</label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => update('apiKey', e.target.value)}
                  placeholder="••••••••••••"
                  className="input-dark font-mono text-sm"
                />
              </div>
            </>
          )}

          {/* Live status via FS25 Web Panel */}
          <div className="pt-2 mt-2 border-t border-dark-400">
            <div className="text-white text-sm font-medium mb-1">Live status (FS25 Web Panel)</div>
            <p className="text-gray-600 text-xs mb-3">
              Opcionalno. Daje broj igrača, mapu i verziju uživo s dedicated server web panela.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Web Port</label>
                <input
                  type="number"
                  value={form.webStatsPort}
                  onChange={(e) => update('webStatsPort', parseInt(e.target.value) || 8080)}
                  placeholder="8080"
                  className="input-dark font-mono text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">Web API Code</label>
                <input
                  value={form.webApiCode}
                  onChange={(e) => update('webApiCode', e.target.value)}
                  placeholder="kod s web panela (?code=...)"
                  className="input-dark font-mono text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Panel korisnik</label>
                <input
                  value={form.webAdminUsername}
                  onChange={(e) => update('webAdminUsername', e.target.value)}
                  placeholder="launcher-admin"
                  className="input-dark font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Panel lozinka</label>
                <input
                  type="password"
                  value={form.webAdminPassword}
                  onChange={(e) => update('webAdminPassword', e.target.value)}
                  placeholder="••••••••••••"
                  className="input-dark font-mono text-sm"
                />
              </div>
            </div>
            <p className="text-gray-600 text-xs mt-2">
              Koristi zaseban korisnički račun iz GIANTS web panela s Game Admin ovlastima.
            </p>
          </div>

          {/* Manual display info (fallback when no Web API code) */}
          <div className="pt-2 mt-2 border-t border-dark-400">
            <div className="text-white text-sm font-medium mb-1">Info za prikaz (ručno)</div>
            <p className="text-gray-600 text-xs mb-3">
              Koristi se ako nema Web API koda. Web Panel ima prednost ako je postavljen.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">Mapa</label>
                <input
                  value={form.map}
                  onChange={(e) => update('map', e.target.value)}
                  placeholder="The village of Yagodnoye"
                  className="input-dark text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Max igrača</label>
                <input
                  type="number"
                  value={form.maxPlayers}
                  onChange={(e) => update('maxPlayers', parseInt(e.target.value) || 16)}
                  placeholder="12"
                  className="input-dark font-mono text-sm"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-gray-400 text-xs mb-1 block">Verzija</label>
              <input
                value={form.version}
                onChange={(e) => update('version', e.target.value)}
                placeholder="1.19.0.0"
                className="input-dark font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-dark-400 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Odustani</button>
          <button
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
            className="btn-gold disabled:opacity-50"
          >
            {isSaving ? 'Sprema...' : (server ? 'Spremi Izmjene' : 'Dodaj Server')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConnectionFields({ prefix, host, port, username, password, path, onUpdate }: {
  prefix: string
  host: string
  port: number
  username: string
  password: string
  path: string
  onUpdate: (key: string, value: unknown) => void
}): React.ReactElement {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-gray-400 text-xs mb-1 block">{prefix.toUpperCase()} Host</label>
          <input
            value={host}
            onChange={(e) => onUpdate(`${prefix}Host`, e.target.value)}
            placeholder="ftp.server.com"
            className="input-dark font-mono text-sm"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => onUpdate(`${prefix}Port`, parseInt(e.target.value))}
            className="input-dark font-mono text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Korisničko ime</label>
          <input
            value={username}
            onChange={(e) => onUpdate(`${prefix}Username`, e.target.value)}
            className="input-dark text-sm"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Lozinka</label>
          <input
            type="password"
            value={password}
            onChange={(e) => onUpdate(`${prefix}Password`, e.target.value)}
            className="input-dark text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-gray-400 text-xs mb-1 block">Remote Path (mods folder)</label>
        <input
          value={path}
          onChange={(e) => onUpdate(`${prefix}Path`, e.target.value)}
          placeholder="/mods"
          className="input-dark font-mono text-sm"
        />
      </div>
    </>
  )
}
