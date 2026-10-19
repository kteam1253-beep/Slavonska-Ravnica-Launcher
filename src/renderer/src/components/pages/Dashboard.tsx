import React, { useEffect, useState } from 'react'
import { useServerStore } from '../../store/server.store'
import { useModStore } from '../../store/mod.store'
import type { Page } from '../../App'
import { useI18n } from '../../i18n'

interface DashboardProps {
  setPage: (page: Page) => void
}

export default function Dashboard({ setPage }: DashboardProps): React.ReactElement {
  const { t } = useI18n()
  const { activeServer, fetchServers, pingServer } = useServerStore()
  const { mods, syncMods, isSyncing, getCounts } = useModStore()
  const [isLaunching, setIsLaunching] = useState(false)
  const [isPinging, setIsPinging] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  useEffect(() => {
    fetchServers()
  }, [])

  // Auto-ping + load mods whenever the active server changes
  useEffect(() => {
    if (activeServer?.id) {
      useModStore.getState().fetchMods(activeServer.id)
      void pingServer(activeServer.id)
    }
  }, [activeServer?.id])

  const counts = getCounts()

  const handleSync = async (): Promise<void> => {
    if (!activeServer) return
    setIsPinging(true)
    await pingServer(activeServer.id)
    setIsPinging(false)
    await syncMods(activeServer.id)
  }

  const handleLaunch = async (): Promise<void> => {
    if (!activeServer) return
    setIsLaunching(true)
    setLaunchError(null)

    try {
      // 1. Check Discord role
      const session = await window.electron.checkSession()
      if (!session.success || !session.data?.hasRole) {
        setLaunchError('Nemate potrebnu Discord rolu.')
        return
      }

      // 2. Check FS installation
      const fsCheck = await window.electron.checkGameInstallation()
      if (!fsCheck.success || !fsCheck.data) {
        setLaunchError('Farming Simulator 25 nije pronađen. Provjerite putanju u Postavkama.')
        return
      }

      // 3. Sync mods
      await syncMods(activeServer.id)

      // 4. Launch game
      const res = await window.electron.launchGame(activeServer.id)
      if (!res.success) {
        setLaunchError(res.error || 'Greška pokretanja igre')
      }
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Neočekivana greška')
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-2xl">{t('dashboard')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('activeServerOverview')}</p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing || isPinging || !activeServer}
          className="btn-ghost flex items-center gap-2 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isSyncing || isPinging ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isPinging ? t('checking') : isSyncing ? t('syncing') : t('sync')}
        </button>
      </div>

      {/* No server selected */}
      {!activeServer && (
        <div className="panel p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-dark-300 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium mb-1">{t('noServerSelected')}</p>
            <p className="text-gray-500 text-sm">{t('selectServer')}</p>
          </div>
          <button onClick={() => setPage('servers')} className="btn-gold">
            {t('goToServers')}
          </button>
        </div>
      )}

      {activeServer && (
        <>
          {/* Server status card */}
          <div className="panel p-5" style={{ borderColor: activeServer.status === 'online' ? 'rgba(34,197,94,0.2)' : '#1a1a1a' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`relative flex-shrink-0 ${activeServer.status === 'online' ? 'dot-online' : 'dot-offline'} w-3 h-3`}>
                  {activeServer.status === 'online' && (
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40" />
                  )}
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl">{activeServer.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-sm font-medium ${activeServer.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                      {activeServer.status === 'online' ? t('online') : t('offline')}
                    </span>
                    {activeServer.ping > 0 && (
                      <span className="text-gray-500 text-sm">{activeServer.ping}ms</span>
                    )}
                    {activeServer.ip && (
                      <span className="text-gray-600 text-xs font-mono">{activeServer.ip}:{activeServer.port}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {activeServer.players !== undefined && (
                  <div className="text-white font-bold text-2xl">
                    {activeServer.players}<span className="text-gray-600 text-sm font-normal">/{activeServer.maxPlayers}</span>
                  </div>
                )}
                <div className="text-gray-500 text-xs">igrača</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dark-400">
              <InfoCell label="Mapa" value={activeServer.map || '—'} />
              <InfoCell label="Verzija" value={activeServer.version || '—'} />
              <InfoCell label="Zadnja sync" value={activeServer.lastSync
                ? new Date(activeServer.lastSync).toLocaleTimeString('hr-HR')
                : 'Nikad'
              } />
            </div>
          </div>

          {/* Mod count cards */}
          <div className="grid grid-cols-4 gap-3">
            <ModCountCard
              label={t('myMods')}
              count={counts.total}
              color="text-gray-300"
              bgColor="bg-dark-300"
              onClick={() => setPage('mods')}
            />
            <ModCountCard
              label={t('missing')}
              count={counts.FALI}
              color="text-red-400"
              bgColor="bg-red-500/10"
              borderColor="border-red-500/20"
              onClick={() => setPage('mods')}
            />
            <ModCountCard
              label={t('update')}
              count={counts.UPDATE}
              color="text-orange-400"
              bgColor="bg-orange-500/10"
              borderColor="border-orange-500/20"
              onClick={() => setPage('mods')}
            />
            <ModCountCard
              label="OK"
              count={counts.OK}
              color="text-green-400"
              bgColor="bg-green-500/10"
              borderColor="border-green-500/20"
              onClick={() => setPage('mods')}
            />
          </div>

          {/* Launch button */}
          <div className="flex flex-col gap-3">
            {launchError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                {launchError}
              </div>
            )}
            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="w-full py-4 rounded-2xl font-bold text-lg text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              style={{
                background: 'linear-gradient(135deg, #F5C518, #d4a017)',
                boxShadow: isLaunching ? 'none' : '0 8px 32px rgba(245,197,24,0.3)'
              }}
            >
              {isLaunching ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Provjera i pokretanje...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Uđi na Server
                </>
              )}
            </button>

            {activeServer.status === 'offline' && (
              <p className="text-center text-gray-600 text-xs">
                Status pokazuje offline (FS25 game port je UDP pa nije uvijek mjerljiv) — možeš svejedno ući
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <div className="text-gray-600 text-xs mb-0.5">{label}</div>
      <div className="text-white text-sm font-medium truncate">{value}</div>
    </div>
  )
}

function ModCountCard({
  label,
  count,
  color,
  bgColor,
  borderColor,
  onClick
}: {
  label: string
  count: number
  color: string
  bgColor: string
  borderColor?: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`panel ${bgColor} ${borderColor || ''} rounded-xl p-4 text-left transition-all duration-200 hover:scale-105 cursor-pointer`}
    >
      <div className={`${color} font-bold text-2xl`}>{count}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </button>
  )
}
