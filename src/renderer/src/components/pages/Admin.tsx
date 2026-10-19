import React, { useEffect, useState } from 'react'
import type { GuildRole, RoleConfig } from '../../../../../shared/types'
import { useSettingsStore } from '../../store/settings.store'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const TIMEOUT_PRESETS = [
  { label: '30s', value: 30000 },
  { label: '1 min', value: 60000 },
  { label: '2 min', value: 120000 },
  { label: '5 min', value: 300000 },
  { label: '10 min', value: 600000 }
]

export default function Admin(): React.ReactElement {
  const [roles, setRoles] = useState<GuildRole[]>([])
  const [config, setConfig] = useState<RoleConfig>({ accessRoleIds: [], uploadRoleIds: [] })
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { settings, fetchSettings, saveSettings } = useSettingsStore()
  const [ftpTimeout, setFtpTimeout] = useState<number>(60000)
  const [timeoutSaved, setTimeoutSaved] = useState(false)

  useEffect(() => {
    load()
    fetchSettings()
  }, [])

  useEffect(() => {
    setFtpTimeout(settings.ftpTimeout || 60000)
  }, [settings.ftpTimeout])

  const load = async (): Promise<void> => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [rolesRes, configRes] = await Promise.all([
        window.electron.adminGetRoles(),
        window.electron.adminGetConfig()
      ])

      if (rolesRes.success && rolesRes.data) {
        const sorted = [...rolesRes.data].sort((a, b) => {
          if (a.name === '@everyone') return 1
          if (b.name === '@everyone') return -1
          return a.name.localeCompare(b.name)
        })
        setRoles(sorted)
      } else {
        setErrorMsg(rolesRes.error || 'Nije moguće dohvatiti role s Discorda. Provjerite DISCORD_BOT_TOKEN u backend env varijablama.')
      }

      if (configRes.success && configRes.data) {
        setConfig(configRes.data)
      }
    } catch {
      setErrorMsg('Greška pri dohvaćanju podataka.')
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = (section: keyof RoleConfig, roleId: string): void => {
    setConfig((prev: RoleConfig) => {
      const current = prev[section]
      const next = current.includes(roleId)
        ? current.filter((id: string) => id !== roleId)
        : [...current, roleId]
      return { ...prev, [section]: next }
    })
  }

  const handleSave = async (): Promise<void> => {
    setSaveState('saving')
    setErrorMsg(null)
    try {
      const res = await window.electron.adminSaveConfig(config)
      if (res.success) {
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2500)
      } else {
        setSaveState('error')
        setErrorMsg(res.error || 'Greška pri spremanju.')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    } catch {
      setSaveState('error')
      setErrorMsg('Greška pri komuniciranju s backendom.')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const handleSaveTimeout = async (): Promise<void> => {
    await saveSettings({ ftpTimeout })
    setTimeoutSaved(true)
    setTimeout(() => setTimeoutSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-dark-400 border-t-gold rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Učitavanje rola...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-2xl">Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Upravljanje pristupom i dozvolama</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving' || loading}
          className="btn-gold flex items-center gap-2"
        >
          {saveState === 'saved' ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Spremljeno!
            </>
          ) : saveState === 'saving' ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Sprema...
            </>
          ) : saveState === 'error' ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Greška
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Spremi Role
            </>
          )}
        </button>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {roles.length === 0 && !errorMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Nema rola. Dodaj <code className="font-mono bg-black/30 px-1 rounded">DISCORD_BOT_TOKEN</code> u backend env varijable i pokreni ponovo.</span>
        </div>
      )}

      {/* FTP Timeout section */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-3 border-b border-dark-400 bg-dark-200 flex items-center gap-2">
          <span className="text-gold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <h2 className="text-white font-semibold text-sm">FTP Upload Timeout</h2>
        </div>
        <div className="px-5 py-3 border-b border-dark-400">
          <p className="text-gray-500 text-xs">
            Maksimalno čekanje na odgovor FTP servera. Povećaj ako dobivaš grešku <code className="font-mono bg-dark-400 px-1 rounded text-gray-400">Timeout (control socket)</code> pri uploadu velikih modova.
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Preset buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {TIMEOUT_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setFtpTimeout(p.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border
                  ${ftpTimeout === p.value
                    ? 'bg-gold text-black border-gold'
                    : 'border-dark-500 text-gray-400 hover:text-white hover:border-dark-300'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                min={5000}
                max={600000}
                step={5000}
                value={ftpTimeout}
                onChange={(e) => setFtpTimeout(Number(e.target.value))}
                className="input-dark w-36 text-sm font-mono"
              />
              <span className="text-gray-500 text-sm">ms</span>
              <span className="text-gray-600 text-xs">
                ({(ftpTimeout / 1000).toFixed(0)}s)
              </span>
            </div>
            <button
              onClick={handleSaveTimeout}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${timeoutSaved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'btn-ghost'
                }`}
            >
              {timeoutSaved ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Spremljeno
                </>
              ) : (
                'Spremi Timeout'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Access roles section */}
      <RoleSection
        title="Pristup Launcheru"
        description="Koje Discord role smiju koristiti SR Launcher. Prazna lista = svi članovi servera mogu ući."
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        roles={roles}
        selectedIds={config.accessRoleIds}
        onToggle={(id) => toggleRole('accessRoleIds', id)}
      />

      {/* Upload roles section */}
      <RoleSection
        title="Upload / Admin Dozvola"
        description="Koje Discord role smiju uploadati modove na server i pristupiti Admin stranici."
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        }
        roles={roles}
        selectedIds={config.uploadRoleIds}
        onToggle={(id) => toggleRole('uploadRoleIds', id)}
      />
    </div>
  )
}

function RoleSection({
  title, description, icon, roles, selectedIds, onToggle
}: {
  title: string
  description: string
  icon: React.ReactElement
  roles: GuildRole[]
  selectedIds: string[]
  onToggle: (id: string) => void
}): React.ReactElement {
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-400 bg-dark-200 flex items-center gap-2">
        <span className="text-gold">{icon}</span>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        {selectedIds.length > 0 && (
          <span className="ml-auto bg-gold/20 text-gold text-xs font-bold px-2 py-0.5 rounded-full">
            {selectedIds.length} odabrano
          </span>
        )}
      </div>
      <div className="px-5 py-3 border-b border-dark-400">
        <p className="text-gray-500 text-xs">{description}</p>
      </div>

      {roles.length === 0 ? (
        <div className="px-5 py-6 text-center text-gray-600 text-sm">Nema dostupnih rola</div>
      ) : (
        <div className="divide-y divide-dark-300 max-h-64 overflow-y-auto">
          {roles.map((role) => {
            const checked = selectedIds.includes(role.id)
            const roleColor = role.color !== 0
              ? `#${role.color.toString(16).padStart(6, '0')}`
              : '#6b7280'

            return (
              <button
                key={role.id}
                onClick={() => onToggle(role.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 transition-colors text-left
                  ${checked ? 'bg-gold/5 hover:bg-gold/10' : 'hover:bg-dark-200'}`}
              >
                <div className={`w-4 h-4 rounded flex-shrink-0 border transition-all flex items-center justify-center
                  ${checked ? 'border-gold bg-gold' : 'border-dark-500 bg-dark-400'}`}>
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: roleColor }} />
                <span className={`text-sm font-medium flex-1 ${checked ? 'text-white' : 'text-gray-300'}`}>
                  {role.name}
                </span>
                <span className="text-gray-700 text-xs font-mono">{role.id}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
