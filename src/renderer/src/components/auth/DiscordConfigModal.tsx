import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../store/settings.store'
import type { AppSettings } from '../../../../../shared/types'

interface DiscordConfigModalProps {
  onClose: () => void
  onSaved: () => void
}

type DiscordFields = Pick<
  AppSettings,
  | 'discordClientId'
  | 'discordClientSecret'
  | 'discordGuildId'
  | 'discordBotToken'
  | 'discordRequiredRoleId'
  | 'discordRequiredRoleName'
>

export default function DiscordConfigModal({ onClose, onSaved }: DiscordConfigModalProps): React.ReactElement {
  const { settings, fetchSettings, saveSettings, isSaving } = useSettingsStore()
  const [form, setForm] = useState<DiscordFields>({
    discordClientId: '',
    discordClientSecret: '',
    discordGuildId: '',
    discordBotToken: '',
    discordRequiredRoleId: '',
    discordRequiredRoleName: 'SR Member'
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    setForm({
      discordClientId: settings.discordClientId,
      discordClientSecret: settings.discordClientSecret,
      discordGuildId: settings.discordGuildId,
      discordBotToken: settings.discordBotToken,
      discordRequiredRoleId: settings.discordRequiredRoleId,
      discordRequiredRoleName: settings.discordRequiredRoleName
    })
  }, [settings])

  const update = (key: keyof DiscordFields, value: string): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (): Promise<void> => {
    await saveSettings(form)
    onSaved()
  }

  const canSave = form.discordClientId.trim() && form.discordClientSecret.trim()

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-drag">
      <div className="panel w-full max-w-md max-h-[90vh] flex flex-col"
           style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-dark-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DiscordIcon />
            <h2 className="text-white font-semibold">Konfiguracija Discorda</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            Unesite podatke s{' '}
            <span
              className="text-gold cursor-pointer hover:underline"
              onClick={() => window.open('https://discord.com/developers/applications', '_blank')}
            >
              Discord Developer Portala
            </span>
            . U OAuth2 → Redirects dodajte: <code className="text-gold">http://localhost:3847/callback</code>
          </p>

          <Field label="Client ID *" value={form.discordClientId} onChange={(v) => update('discordClientId', v)} placeholder="1234567890..." mono />
          <Field label="Client Secret *" value={form.discordClientSecret} onChange={(v) => update('discordClientSecret', v)} placeholder="••••••••••••" mono password />
          <Field label="Guild ID (ID servera)" value={form.discordGuildId} onChange={(v) => update('discordGuildId', v)} placeholder="1234567890..." mono />
          <Field label="Bot Token" value={form.discordBotToken} onChange={(v) => update('discordBotToken', v)} placeholder="Bot token..." mono password />
          <Field label="Required Role ID" value={form.discordRequiredRoleId} onChange={(v) => update('discordRequiredRoleId', v)} placeholder="1234567890..." mono />
          <Field label="Naziv Role" value={form.discordRequiredRoleName} onChange={(v) => update('discordRequiredRoleName', v)} placeholder="SR Member" />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-dark-400 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Odustani</button>
          <button onClick={handleSave} disabled={isSaving || !canSave} className="btn-gold disabled:opacity-50">
            {isSaving ? 'Sprema...' : 'Spremi'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, mono, password }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
  password?: boolean
}): React.ReactElement {
  return (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">{label}</label>
      <input
        type={password ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-dark text-sm ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

function DiscordIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}
