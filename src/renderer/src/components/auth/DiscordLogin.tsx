import React, { useState } from 'react'
import { useAuthStore } from '../../store/auth.store'
import DiscordConfigModal from './DiscordConfigModal'
import logoUrl from '../../assets/logo.png'
import { isBackendMode } from '../../../../shared/app-config'
import { useI18n } from '../../i18n'

export default function DiscordLogin(): React.ReactElement {
  const { login, isLoading, error, setError } = useAuthStore()
  const [showConfig, setShowConfig] = useState(false)
  const backendMode = isBackendMode()
  const { t } = useI18n()

  return (
    <div className="h-screen w-screen bg-dark flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Custom title bar */}
      <div className="absolute top-0 left-0 right-0 h-8 drag-region bg-transparent" />

      {/* Window controls */}
      <div className="absolute top-3 right-4 flex gap-2 no-drag z-10">
        <button
          onClick={() => (window as { electronWindow?: { close: () => void } }).electronWindow?.close()}
          className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors"
        />
      </div>

      {/* Main card */}
      <div className="panel p-10 w-full max-w-sm mx-4 flex flex-col items-center gap-8 relative z-10"
           style={{ boxShadow: '0 0 60px rgba(245, 197, 24, 0.08), 0 24px 48px rgba(0,0,0,0.8)' }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <img
              src={logoUrl}
              alt="Slavonska Ravnica"
              className="w-24 h-24 object-contain"
              style={{ filter: 'drop-shadow(0 0 30px rgba(245, 197, 24, 0.3))' }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-white font-black text-2xl tracking-wider">SR LAUNCHER</h1>
            <p className="text-gray-500 text-sm mt-1">Slavonska Ravnica · Farming Simulator 25</p>
          </div>
        </div>

        <div className="w-full h-px bg-dark-400" />

        {/* Login section */}
        <div className="w-full flex flex-col items-center gap-4">
          <h2 className="text-white font-semibold text-lg">{t('loginDiscord')}</h2>
          <p className="text-gray-500 text-sm text-center leading-relaxed">
            Morate se prijaviti putem Discord računa za pristup SR Launcheru.
          </p>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={login}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isLoading ? '#1a1a1a' : 'linear-gradient(135deg, #5865F2, #4752c4)',
              boxShadow: isLoading ? 'none' : '0 4px 20px rgba(88, 101, 242, 0.4)'
            }}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('loggingIn')}</span>
              </>
            ) : (
              <>
                <DiscordIcon />
                <span>{t('loginDiscord')}</span>
              </>
            )}
          </button>

          {/* Config button - only in local mode (backend mode needs no client config) */}
          {!backendMode && (
          <button
            onClick={() => setShowConfig(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-medium text-gray-400 border border-dark-400 hover:border-gold hover:text-gold hover:bg-gold/5 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t('configureDiscord')}</span>
          </button>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center">
          {backendMode ? 'Prijavi se svojim Discord računom' : 'Prvo postavljanje? Kliknite "Konfiguriraj Discord"'}
        </p>
      </div>

      <p className="absolute bottom-4 text-gray-700 text-xs">
        SR Launcher V2 · Slavonska Ravnica © 2024
      </p>

      {showConfig && (
        <DiscordConfigModal
          onClose={() => setShowConfig(false)}
          onSaved={() => {
            setShowConfig(false)
            setError(null)
          }}
        />
      )}
    </div>
  )
}

function DiscordIcon(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.115 18.105.13 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}
