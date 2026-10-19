import React from 'react'
import { useAuthStore } from '../../store/auth.store'
import { useI18n } from '../../i18n'

export default function AccessDenied(): React.ReactElement {
  const { user, logout } = useAuthStore()
  const { t } = useI18n()

  return (
    <div className="h-screen w-screen bg-dark flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-8 drag-region" />

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="panel p-10 w-full max-w-sm mx-4 flex flex-col items-center gap-6 z-10 text-center"
           style={{ boxShadow: '0 0 60px rgba(239, 68, 68, 0.05), 0 24px 48px rgba(0,0,0,0.8)' }}>

        {/* Icon */}
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Message */}
        <div>
          <h2 className="text-white font-bold text-xl mb-2">{t('accessDenied')}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Nemate potrebnu Discord ulogu za igranje.
          </p>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Obratite se administratorima Discord zajednice.
          </p>
        </div>

        {user && (
          <div className="w-full bg-dark-300 rounded-xl p-3 flex items-center gap-3">
            {user.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
                alt="Avatar"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-500 flex items-center justify-center text-gray-400 font-bold">
                {user.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <div className="text-white font-medium text-sm">{user.globalName || user.username}</div>
              <div className="text-gray-500 text-xs">@{user.username}</div>
            </div>
          </div>
        )}

        <div className="w-full h-px bg-dark-400" />

        <button
          onClick={logout}
          className="btn-ghost w-full"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
