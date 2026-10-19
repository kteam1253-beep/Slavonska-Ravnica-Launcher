import React from 'react'
import type { Page } from '../../App'
import { useAuthStore } from '../../store/auth.store'
import { useServerStore } from '../../store/server.store'
import { useDownloadStore } from '../../store/download.store'
import { useI18n } from '../../i18n'

interface SidebarProps {
  currentPage: Page
  setCurrentPage: (page: Page) => void
}

interface NavItem {
  id: Page
  label: string
  icon: React.ReactElement
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    id: 'servers',
    label: 'servers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    )
  },
  {
    id: 'dashboard',
    label: 'dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    id: 'mods',
    label: 'mods',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    id: 'settings',
    label: 'settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 'admin',
    label: 'admin',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  },
  {
    id: 'logs',
    label: 'logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'panel',
    label: 'panel',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2h-5l2 4H9l2-4H6a2 2 0 01-2-2V5zm4 7l2-2-2-2m4 4h4" />
      </svg>
    )
  }
]

export default function Sidebar({ currentPage, setCurrentPage }: SidebarProps): React.ReactElement {
  const { user, logout, canUpload } = useAuthStore()
  const { activeServer } = useServerStore()
  const { getActiveCount } = useDownloadStore()
  const { t } = useI18n()

  const activeDownloads = getActiveCount()
  const visibleItems = navItems.filter((item) => !item.adminOnly || canUpload)

  return (
    <div
      className="w-52 flex flex-col bg-dark-100 border-r border-dark-300 flex-shrink-0"
      style={{ borderRight: '1px solid #1a1a1a' }}
    >
      {/* Server indicator */}
      <div className="px-4 py-3 border-b border-dark-400">
        <div className="flex items-center gap-2">
          <div className={activeServer?.status === 'online' ? 'dot-online' : 'dot-offline'} />
          <span className="text-xs font-medium truncate" style={{ color: activeServer ? '#fff' : '#555' }}>
            {activeServer?.name || t('noServer')}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="text-sm font-medium">{t(item.label)}</span>
            {item.id === 'mods' && activeDownloads > 0 && (
              <span className="ml-auto bg-gold text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                {activeDownloads}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom: User info */}
      <div className="border-t border-dark-400 p-3">
        <div className="flex items-center gap-2.5 mb-2">
          {user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
              alt="Avatar"
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-dark-500 flex items-center justify-center text-gray-400 text-sm font-bold flex-shrink-0">
              {user?.username[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-medium truncate">{user?.globalName || user?.username}</div>
            <div className="text-gray-600 text-xs truncate">@{user?.username}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-xs text-gray-600 hover:text-red-400 transition-colors py-1 text-left"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
