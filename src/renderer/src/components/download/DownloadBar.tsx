import React, { useState } from 'react'
import { useDownloadStore } from '../../store/download.store'
import type { DownloadItem } from '../../../../../shared/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function DownloadBar(): React.ReactElement | null {
  const { downloads, getActiveCount, getTotalProgress, cancelDownload, pauseDownload, resumeDownload } = useDownloadStore()
  const [expanded, setExpanded] = useState(false)

  const activeCount = getActiveCount()
  const totalProgress = getTotalProgress()

  if (downloads.length === 0) return null

  const active = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'pending' || d.status === 'verifying'
  )
  const recent = downloads.filter((d) => d.status === 'completed' || d.status === 'error' || d.status === 'paused')

  return (
    <div className="border-t border-dark-400 bg-dark-100 flex-shrink-0" style={{ borderTop: '1px solid #1a1a1a' }}>
      {/* Summary bar */}
      <div
        className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-dark-200 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {activeCount > 0 && (
          <div className="w-4 h-4 border-2 border-dark-500 border-t-gold rounded-full animate-spin flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-xs">
              {activeCount > 0
                ? `Preuzimanje ${activeCount} mod${activeCount > 1 ? 'a' : 'a'}...`
                : `${downloads.length} preuzimanje${downloads.length > 1 ? 'a' : ''}`
              }
            </span>
            <span className="text-gray-600 text-xs">{Math.round(totalProgress)}%</span>
          </div>
          <div className="w-full h-1 bg-dark-500 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-dark-400">
          {[...active, ...recent].map((item) => (
            <DownloadRow
              key={item.id}
              item={item}
              onPause={() => pauseDownload(item.id)}
              onResume={() => resumeDownload(item.id)}
              onCancel={() => cancelDownload(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DownloadRow({ item, onPause, onResume, onCancel }: {
  item: DownloadItem
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}): React.ReactElement {
  const isActive = item.status === 'downloading' || item.status === 'verifying'
  const isPaused = item.status === 'paused'
  const isDone = item.status === 'completed'
  const isError = item.status === 'error'

  return (
    <div className="px-4 py-2.5 border-b border-dark-300/30 flex items-center gap-3">
      {/* Status icon */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        {isActive && (
          <div className="w-3.5 h-3.5 border-2 border-dark-500 border-t-gold rounded-full animate-spin" />
        )}
        {isPaused && (
          <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        )}
        {isDone && (
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {isError && (
          <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {item.status === 'pending' && (
          <div className="w-2 h-2 rounded-full bg-gray-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white text-xs font-medium truncate">{item.fileName}</span>
          <div className="flex items-center gap-3 text-gray-600 text-xs flex-shrink-0">
            {isActive && item.speed > 0 && (
              <span>{formatSpeed(item.speed)}</span>
            )}
            {isActive && item.eta > 0 && (
              <span>{formatEta(item.eta)}</span>
            )}
            {isActive && item.totalSize > 0 && (
              <span>{formatBytes(item.downloadedSize)}/{formatBytes(item.totalSize)}</span>
            )}
            {isDone && <span className="text-green-500">Završeno</span>}
            {isError && <span className="text-red-400">{item.error || 'Greška'}</span>}
          </div>
        </div>
        {(isActive || isPaused) && (
          <div className="mt-1 w-full h-1 bg-dark-500 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                item.status === 'verifying' ? 'animate-shimmer bg-blue-500' : 'bg-gold'
              }`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isActive && (
          <button
            onClick={onPause}
            title="Pauziraj"
            className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-yellow-400 transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
        )}
        {isPaused && (
          <button
            onClick={onResume}
            title="Nastavi"
            className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-gold transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        {!isDone && (
          <button
            onClick={onCancel}
            title="Otkaži"
            className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
