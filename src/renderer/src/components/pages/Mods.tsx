import React, { useEffect, useState } from 'react'
import { useModStore } from '../../store/mod.store'
import { useServerStore } from '../../store/server.store'
import { useUploadStore } from '../../store/upload.store'
import { useAuthStore } from '../../store/auth.store'
import type { Mod, UploadItem } from '../../../../../shared/types'

const STATUS_CONFIG: Record<Mod['status'], { label: string; color: string; bg: string }> = {
  OK:      { label: 'OK',     color: 'text-green-400',  bg: 'bg-green-500/10' },
  UPDATE:  { label: 'UPDATE', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  NOVI:    { label: 'LOKALNI', color: 'text-blue-400',  bg: 'bg-blue-500/10' },
  FALI:    { label: 'FALI',   color: 'text-red-400',    bg: 'bg-red-500/10' },
  GREŠKA:  { label: 'GREŠKA', color: 'text-red-400',    bg: 'bg-red-500/10' }
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return ''
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
}

function formatEta(sec: number): string {
  if (!sec || sec <= 0 || !isFinite(sec)) return ''
  if (sec < 60) return `${Math.round(sec)}s`
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`
}

export default function Mods(): React.ReactElement {
  const { activeServer } = useServerStore()
  const {
    getFiltered, getCounts, filter, setFilter, searchQuery, setSearch,
    syncMods, downloadMissing, updateAllMods, syncAll, deleteObsolete, downloadSingle,
    isSyncing, isLoading, fetchMods
  } = useModStore()
  const { uploads, selectAndUpload, cancelUpload, clearFinished } = useUploadStore()
  const { canUpload } = useAuthStore()
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleUpload = async (): Promise<void> => {
    if (!activeServer) return
    setUploadError(null)
    const res = await selectAndUpload(activeServer.id)
    if (!res.ok) setUploadError(res.error || 'Greška pri uploadu')
  }

  useEffect(() => {
    if (activeServer) fetchMods(activeServer.id)
  }, [activeServer?.id])

  useEffect(() => {
    useUploadStore.getState().fetchUploads()
  }, [])

  const filteredMods = getFiltered()
  const counts = getCounts()

  const filterButtons: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'Sve', count: counts.total },
    { key: 'FALI', label: 'Fali', count: counts.FALI },
    { key: 'UPDATE', label: 'Update', count: counts.UPDATE },
    { key: 'NOVI', label: 'Lokalni', count: counts.NOVI },
    { key: 'OK', label: 'OK', count: counts.OK },
    { key: 'GREŠKA', label: 'Greška', count: counts.GREŠKA }
  ]

  return (
    <div className="p-6 flex flex-col gap-5 h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-bold text-2xl">Modovi</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeServer ? activeServer.name : 'Nema aktivnog servera'} · {counts.total} modova
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => activeServer && syncMods(activeServer.id)}
          disabled={isSyncing || !activeServer}
          className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Osvježi
        </button>

        <button
          onClick={() => activeServer && downloadMissing(activeServer.id)}
          disabled={isSyncing || !activeServer || counts.FALI === 0}
          className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Skini Što Fali ({counts.FALI})
        </button>

        <button
          onClick={() => activeServer && updateAllMods(activeServer.id)}
          disabled={isSyncing || !activeServer || counts.UPDATE === 0}
          className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Ažuriraj ({counts.UPDATE})
        </button>

        <button
          onClick={() => activeServer && syncAll(activeServer.id)}
          disabled={isSyncing || !activeServer}
          className="btn-gold flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sinkroniziraj Sve
        </button>

        <button
          onClick={() => activeServer && deleteObsolete(activeServer.id)}
          disabled={isSyncing || !activeServer || counts.NOVI === 0}
          className="btn-danger flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Obriši Lokalne ({counts.NOVI})
        </button>

        {/* Upload (admin) - only when the active server has FTP/SFTP credentials */}
        {canUpload && (
          <button
            onClick={handleUpload}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium text-gold border border-gold/40 hover:bg-gold/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Modove
          </button>
        )}
      </div>

      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {uploadError}
        </div>
      )}

      {uploads.length > 0 && (
        <UploadPanel uploads={uploads} onCancel={cancelUpload} onClear={clearFinished} />
      )}

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Pretraži modove..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9 text-sm w-56"
          />
        </div>

        <div className="flex items-center gap-1 bg-dark-200 rounded-xl p-1 border border-dark-400">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filter === btn.key
                  ? 'bg-gold text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {btn.label}
              {btn.count > 0 && <span className="ml-1 opacity-70">({btn.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {!activeServer ? (
        <div className="panel p-8 text-center text-gray-600">Nema aktivnog servera</div>
      ) : isLoading ? (
        <div className="panel p-8 flex items-center justify-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-dark-500 border-t-gold rounded-full animate-spin" />
          Učitavanje modova...
        </div>
      ) : (
        <div className="panel overflow-hidden flex-1">
          <div className="overflow-x-auto overflow-y-auto max-h-full">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-dark-200 z-10">
                <tr className="border-b border-dark-400">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-20">Status</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Mod</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-24">Lokalno</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-24">Server</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-28">Veličina</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium w-20">Akcija</th>
                </tr>
              </thead>
              <tbody>
                {filteredMods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-600">
                      Nema modova za prikaz
                    </td>
                  </tr>
                ) : (
                  filteredMods.map((mod) => (
                    <ModRow key={mod.id} mod={mod} onDownload={downloadSingle} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadPanel({
  uploads,
  onCancel,
  onClear
}: {
  uploads: UploadItem[]
  onCancel: (id: string) => void
  onClear: () => void
}): React.ReactElement {
  const active = uploads.filter((u) => u.status === 'uploading' || u.status === 'pending').length
  const done = uploads.filter((u) => u.status === 'completed').length

  const statusColor: Record<UploadItem['status'], string> = {
    pending: 'text-gray-500',
    uploading: 'text-gold',
    completed: 'text-green-400',
    error: 'text-red-400',
    cancelled: 'text-gray-600'
  }
  const statusLabel: Record<UploadItem['status'], string> = {
    pending: 'čeka',
    uploading: 'upload...',
    completed: 'gotovo',
    error: 'greška',
    cancelled: 'otkazano'
  }

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-white text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload na server · {done}/{uploads.length} gotovo
          {active > 0 && <span className="text-gray-500">({active} u redu)</span>}
        </div>
        <button onClick={onClear} className="text-gray-500 hover:text-white text-xs">Očisti gotove</button>
      </div>

      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
        {uploads.map((u) => (
          <div key={u.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-300 text-xs font-mono truncate" title={u.fileName}>{u.fileName}</span>
                <span className={`text-xs ${statusColor[u.status]} shrink-0`}>
                  {u.status === 'uploading'
                    ? `${u.progress.toFixed(0)}% · ${formatSpeed(u.speed)}${formatEta(u.eta) ? ' · ' + formatEta(u.eta) : ''}`
                    : statusLabel[u.status]}
                </span>
              </div>
              <div className="h-1.5 bg-dark-400 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${u.status === 'error' ? 'bg-red-500' : u.status === 'completed' ? 'bg-green-500' : 'bg-gold'}`}
                  style={{ width: `${u.status === 'completed' ? 100 : u.progress}%` }}
                />
              </div>
            </div>
            {(u.status === 'uploading' || u.status === 'pending') && (
              <button
                onClick={() => onCancel(u.id)}
                title="Otkaži"
                className="text-gray-600 hover:text-red-400 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ModRow({ mod, onDownload }: { mod: Mod; onDownload: (id: string) => void }): React.ReactElement {
  const cfg = STATUS_CONFIG[mod.status]

  return (
    <tr className="table-row-hover border-b border-dark-300/50">
      <td className="px-4 py-3">
        <span className={`badge ${cfg.bg} ${cfg.color} font-mono text-xs`}>
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-white font-medium text-sm truncate max-w-xs" title={mod.fileName}>
          {mod.name}
        </div>
        <div className="text-gray-600 text-xs font-mono truncate">{mod.fileName}</div>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-400 text-xs font-mono">{mod.localVersion || '—'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-400 text-xs font-mono">{mod.serverVersion || '—'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-500 text-xs">{formatBytes(mod.serverSize || mod.localSize)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        {(mod.status === 'FALI' || mod.status === 'UPDATE' || mod.status === 'GREŠKA') && (
          <button
            onClick={() => onDownload(mod.id)}
            title="Preuzmi"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gold hover:bg-gold/10 transition-colors ml-auto"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  )
}
