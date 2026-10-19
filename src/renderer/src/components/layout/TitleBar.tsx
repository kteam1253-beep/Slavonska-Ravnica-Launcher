import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/auth.store'
import logoUrl from '../../assets/logo.png'
import { languageOptions, useI18n } from '../../i18n'

declare global {
  interface Window {
    electronWindow: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
  }
}

export default function TitleBar(): React.ReactElement {
  const { user } = useAuthStore()
  const { language, setLanguage, t } = useI18n()
  const [version, setVersion] = useState('...')

  useEffect(() => {
    window.electron.getAppVersion()
      .then(setVersion)
      .catch(() => setVersion(''))
  }, [])

  return (
    <div
      className="h-10 bg-dark-100 border-b border-dark-400 flex items-center justify-between px-4 drag-region flex-shrink-0"
      style={{ borderBottom: '1px solid #1a1a1a' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2 no-drag">
        <img src={logoUrl} alt="SR" className="w-5 h-5 object-contain" />
        <span className="text-white/60 text-xs font-medium tracking-widest">
          SR LAUNCHER {version ? `v${version}` : ''}
        </span>
      </div>

      {/* Center: Title */}
      <div className="text-gray-600 text-xs">Slavonska Ravnica · FS25</div>

      {/* Right: User + window controls */}
      <div className="flex items-center gap-3 no-drag">
        {user && (
          <div className="flex items-center gap-2 pr-3 border-r border-dark-400">
            {user.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                alt="Avatar"
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-dark-500 flex items-center justify-center text-gray-400 text-xs font-bold">
                {user.username[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-gray-400 text-xs">{user.globalName || user.username}</span>
          </div>
        )}

        <label className="relative flex items-center gap-1.5 pr-3 border-r border-dark-400 text-gray-500 text-xs" title={t('language')}>
          <span className="text-sm">🌐</span>
          <select
            value={language}
            onChange={(event) => void setLanguage(event.target.value as typeof language)}
            className="appearance-none bg-transparent text-gray-300 hover:text-white outline-none cursor-pointer pr-1 text-xs"
            aria-label={t('language')}
          >
            {languageOptions.map((option) => <option key={option.value} value={option.value} className="bg-dark text-white">{option.flag} {t(option.labelKey)}</option>)}
          </select>
        </label>

        {/* Window controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.electronWindow?.minimize()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-dark-400 transition-colors"
          >
            <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
              <rect width="10" height="2" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => window.electronWindow?.maximize()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-dark-400 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="8" height="8" rx="1.5" />
            </svg>
          </button>
          <button
            onClick={() => window.electronWindow?.close()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
