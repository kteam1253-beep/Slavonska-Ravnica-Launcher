import React, { useEffect, useState } from 'react'
import { useServerStore } from '../../store/server.store'
import type { GameServer } from '../../../../../shared/types'
import ServerModal from '../common/ServerModal'
import { useAuthStore } from '../../store/auth.store'
import { useI18n } from '../../i18n'

export default function Servers(): React.ReactElement {
  const { servers, activeServer, fetchServers, setActiveServer, deleteServer, pingServer } = useServerStore()
  const { canUpload } = useAuthStore()
  const { t } = useI18n()
  const [showModal, setShowModal] = useState(false)
  const [editServer, setEditServer] = useState<GameServer | null>(null)
  const [pinging, setPinging] = useState<string | null>(null)

  useEffect(() => {
    fetchServers()
  }, [])

  const handlePing = async (server: GameServer): Promise<void> => {
    setPinging(server.id)
    await pingServer(server.id)
    setPinging(null)
  }

  const handleEdit = (server: GameServer): void => {
    setEditServer(server)
    setShowModal(true)
  }

  const handleAdd = (): void => {
    setEditServer(null)
    setShowModal(true)
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (window.confirm('Obrisati server?')) {
      await deleteServer(id)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-2xl">{t('servers')}</h1>
          <p className="text-gray-500 text-sm mt-1">{servers.length} serverа konfigurirano</p>
        </div>
        {canUpload && <button onClick={handleAdd} className="btn-gold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addServer')}
        </button>}
      </div>

      {/* Server list */}
      {servers.length === 0 ? (
        <div className="panel p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-dark-300 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium mb-1">{t('noServers')}</p>
            <p className="text-gray-500 text-sm">{t('clickAddServer')}</p>
          </div>
          {canUpload && <button onClick={handleAdd} className="btn-gold">{t('addFirstServer')}</button>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              isActive={activeServer?.id === server.id}
              isPinging={pinging === server.id}
              onSelect={() => setActiveServer(server.id)}
              onPing={() => handlePing(server)}
              onEdit={() => handleEdit(server)}
              onDelete={() => handleDelete(server.id)}
              canManage={canUpload}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ServerModal
          server={editServer}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            fetchServers()
          }}
        />
      )}
    </div>
  )
}

interface ServerCardProps {
  server: GameServer
  isActive: boolean
  isPinging: boolean
  onSelect: () => void
  onPing: () => void
  onEdit: () => void
  onDelete: () => void
  canManage: boolean
}

function ServerCard({ server, isActive, isPinging, onSelect, onPing, onEdit, onDelete, canManage }: ServerCardProps): React.ReactElement {
  return (
    <div
      className={`panel p-4 transition-all duration-200 cursor-pointer ${
        isActive
          ? 'border-gold/40 bg-gold/5'
          : 'hover:border-dark-600'
      }`}
      onClick={onSelect}
      style={isActive ? { boxShadow: '0 0 20px rgba(245,197,24,0.08)' } : {}}
    >
      <div className="flex items-center gap-4">
        {/* Status dot */}
        <div className="flex-shrink-0">
          <div className={server.status === 'online' ? 'dot-online' : server.status === 'offline' ? 'dot-offline' : 'dot-unknown'} />
        </div>

        {/* Server info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{server.name}</span>
            {isActive && (
              <span className="badge bg-gold/15 text-gold text-xs">AKTIVAN</span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1">
            {server.ip && (
              <span className="text-gray-600 text-xs font-mono">{server.ip}:{server.port}</span>
            )}
            {server.map && (
              <span className="text-gray-500 text-xs">{server.map}</span>
            )}
            {server.version && (
              <span className="text-gray-600 text-xs">v{server.version}</span>
            )}
          </div>
        </div>

        {/* Players */}
        <div className="text-right flex-shrink-0">
          {server.status === 'online' && (
            <>
              <div className="text-white font-bold">{server.players}/{server.maxPlayers}</div>
              <div className="text-gray-600 text-xs">igrača</div>
            </>
          )}
          {server.ping > 0 && server.status === 'online' && (
            <div className="text-green-400 text-xs">{server.ping}ms</div>
          )}
          {server.status === 'offline' && (
            <div className="text-red-400 text-xs">Offline</div>
          )}
          {server.status === 'unknown' && (
            <div className="text-gray-600 text-xs">Nepoznato</div>
          )}
        </div>

        {/* Connection type badge */}
        <div className="flex-shrink-0">
          <span className="badge bg-dark-400 text-gray-400 uppercase text-xs">
            {server.connectionType}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onPing}
            disabled={isPinging}
            title="Ping"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {isPinging ? (
              <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </button>
          {canManage && <button
            onClick={onEdit}
            title="Uredi"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-dark-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>}
          {canManage && <button
            onClick={onDelete}
            title="Obriši"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>}
        </div>
      </div>
    </div>
  )
}
