import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../store/settings.store'
import type { AppSettings } from '../../../../../shared/types'

export default function Settings(): React.ReactElement {
  const { settings, fetchSettings, saveSettings, selectFile, selectFolder, isSaving } = useSettingsStore()
  const [form, setForm] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const update = (key: keyof AppSettings, value: unknown): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (): Promise<void> => {
    await saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSelectFs = async (): Promise<void> => {
    const path = await selectFile([{ name: 'Farming Simulator 25', extensions: ['exe'] }])
    if (path) update('fsExePath', path)
  }

  const handleSelectMods = async (): Promise<void> => {
    const path = await selectFolder()
    if (path) update('modsFolder', path)
  }

  return (
    <div className="p-6 max-w-2xl flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-2xl">Postavke</h1>
          <p className="text-gray-500 text-sm mt-1">Konfiguracija launchera</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-gold flex items-center gap-2"
        >
          {saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Spremljeno!
            </>
          ) : isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Sprema...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Spremi Postavke
            </>
          )}
        </button>
      </div>

      {/* FS25 Section */}
      <SettingsSection title="Farming Simulator 25">
        <SettingsRow label="FS25 Putanja" description="Lokacija FarmingSimulator2025.exe">
          <div className="flex gap-2">
            <input
              value={form.fsExePath}
              onChange={(e) => update('fsExePath', e.target.value)}
              placeholder="C:\Program Files\Farming Simulator 2025\FarmingSimulator2025.exe"
              className="input-dark flex-1 text-sm"
            />
            <button onClick={handleSelectFs} className="btn-ghost flex-shrink-0 px-3">
              Odaberi
            </button>
          </div>
        </SettingsRow>

        <SettingsRow label="Mods Folder" description="Folder gdje se nalaze vaši modovi">
          <div className="flex gap-2">
            <input
              value={form.modsFolder}
              onChange={(e) => update('modsFolder', e.target.value)}
              placeholder="Documents\My Games\FarmingSimulator2025\mods"
              className="input-dark flex-1 text-sm"
            />
            <button onClick={handleSelectMods} className="btn-ghost flex-shrink-0 px-3">
              Odaberi
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Discord Section */}
      <SettingsSection title="Discord Integracija">
        <SettingsRow label="Client ID" description="Discord aplikacija Client ID">
          <input
            value={form.discordClientId}
            onChange={(e) => update('discordClientId', e.target.value)}
            placeholder="1234567890..."
            className="input-dark text-sm font-mono"
          />
        </SettingsRow>
        <SettingsRow label="Client Secret" description="Discord aplikacija Client Secret">
          <input
            type="password"
            value={form.discordClientSecret}
            onChange={(e) => update('discordClientSecret', e.target.value)}
            placeholder="••••••••••••••••"
            className="input-dark text-sm font-mono"
          />
        </SettingsRow>
        <SettingsRow label="Guild ID" description="ID vašeg Discord servera">
          <input
            value={form.discordGuildId}
            onChange={(e) => update('discordGuildId', e.target.value)}
            placeholder="1234567890..."
            className="input-dark text-sm font-mono"
          />
        </SettingsRow>
        <SettingsRow label="Bot Token" description="Discord Bot Token za provjeru rola">
          <input
            type="password"
            value={form.discordBotToken}
            onChange={(e) => update('discordBotToken', e.target.value)}
            placeholder="Bot token..."
            className="input-dark text-sm font-mono"
          />
        </SettingsRow>
        <SettingsRow label="Required Role ID" description="ID Discord role potrebne za pristup">
          <input
            value={form.discordRequiredRoleId}
            onChange={(e) => update('discordRequiredRoleId', e.target.value)}
            placeholder="1234567890..."
            className="input-dark text-sm font-mono"
          />
        </SettingsRow>
        <SettingsRow label="Naziv Role" description="Naziv role za prikaz korisniku">
          <input
            value={form.discordRequiredRoleName}
            onChange={(e) => update('discordRequiredRoleName', e.target.value)}
            placeholder="SR Member"
            className="input-dark text-sm"
          />
        </SettingsRow>
      </SettingsSection>

      {/* Auto Update Section */}
      <SettingsSection title="Automatska ažuriranja">
        <SettingsRow label="Automatski update launchera" description="Provjeri i preuzmi ažuriranja pri pokretanju">
          <Toggle
            checked={form.autoUpdateLauncher}
            onChange={(v) => update('autoUpdateLauncher', v)}
          />
        </SettingsRow>
        <SettingsRow label="Automatski update modova" description="Preuzmi modove koji fale pri pokretanju">
          <Toggle
            checked={form.autoUpdateMods}
            onChange={(v) => update('autoUpdateMods', v)}
          />
        </SettingsRow>
        <SettingsRow label="Pokreni s Windowsom" description="Automatski pokreni launcher pri startu Windowsa">
          <Toggle
            checked={form.launchWithWindows}
            onChange={(v) => update('launchWithWindows', v)}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-400 bg-dark-200">
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      <div className="divide-y divide-dark-300">
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="px-5 py-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium">{label}</div>
          {description && <div className="text-gray-600 text-xs mt-0.5">{description}</div>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): React.ReactElement {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-gold' : 'bg-dark-500'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
