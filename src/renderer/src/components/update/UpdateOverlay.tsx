import React from 'react'
import logoUrl from '../../assets/logo.png'

export type UpdateStage = 'available' | 'downloading' | 'downloaded' | 'error'

export interface UpdateInfo {
  version?: string
}

export interface UpdateProgressInfo {
  percent?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
}

interface UpdateOverlayProps {
  stage: UpdateStage
  info: UpdateInfo | null
  currentVersion: string
  progress: UpdateProgressInfo | null
  error?: string | null
  onDownload: () => void
  onInstall: () => void
  onDismiss: () => void
}

function formatBytes(value?: number): string {
  if (!value || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export default function UpdateOverlay({
  stage,
  info,
  currentVersion,
  progress,
  error,
  onDownload,
  onInstall,
  onDismiss
}: UpdateOverlayProps): React.ReactElement {
  const percent = Math.max(0, Math.min(100, progress?.percent ?? 0))
  const version = info?.version || 'nova verzija'
  const isDownloading = stage === 'downloading'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="panel w-full max-w-md overflow-hidden shadow-2xl" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.85)' }}>
        <div className="px-5 py-4 border-b border-dark-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
              {isDownloading && <div className="absolute inset-[-4px] rounded-full border-2 border-dark-500 border-t-gold animate-spin" />}
              <img src={logoUrl} alt="SR" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Ažuriranje launchera</div>
              <div className="text-gray-500 text-xs">Trenutna verzija: {currentVersion || 'nepoznato'}</div>
            </div>
          </div>
          {!isDownloading && (
            <button onClick={onDismiss} className="text-gray-500 hover:text-white transition-colors" aria-label="Zatvori">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-5">
          {stage === 'available' && (
            <>
              <h2 className="text-white text-lg font-semibold mb-2">Dostupna je nova verzija {version}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Preuzmi najnoviji launcher sada ili nastavi koristiti trenutnu verziju.
              </p>
            </>
          )}

          {stage === 'downloading' && (
            <>
              <h2 className="text-white text-lg font-semibold mb-2">Launcher se preuzima</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Nemoj zatvarati launcher. U tijeku je update na noviju verziju {version}.
              </p>
              <div className="h-3 bg-dark-400 rounded-full overflow-hidden border border-dark-500">
                <div
                  className="h-full bg-gold transition-all duration-300"
                  style={{ width: `${percent}%`, boxShadow: '0 0 18px rgba(245,197,24,0.45)' }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gold font-semibold">{percent.toFixed(0)}%</span>
                <span className="text-gray-500">
                  {formatBytes(progress?.transferred)} / {formatBytes(progress?.total)}
                </span>
              </div>
            </>
          )}

          {stage === 'downloaded' && (
            <>
              <h2 className="text-white text-lg font-semibold mb-2">Verzija {version} je preuzeta</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Restartaj launcher kako bi se update instalirao.
              </p>
            </>
          )}

          {stage === 'error' && (
            <>
              <h2 className="text-red-400 text-lg font-semibold mb-2">Greška pri ažuriranju</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{error || 'Pokušaj ponovno kasnije.'}</p>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-dark-400 flex justify-end gap-3">
          {stage === 'available' && (
            <>
              <button onClick={onDismiss} className="btn-ghost">Kasnije</button>
              <button onClick={onDownload} className="btn-gold">Preuzmi update</button>
            </>
          )}
          {stage === 'downloading' && (
            <button disabled className="btn-ghost opacity-60 cursor-not-allowed">Preuzimanje...</button>
          )}
          {stage === 'downloaded' && (
            <>
              <button onClick={onDismiss} className="btn-ghost">Kasnije</button>
              <button onClick={onInstall} className="btn-gold">Restartaj sada</button>
            </>
          )}
          {stage === 'error' && (
            <button onClick={onDismiss} className="btn-gold">U redu</button>
          )}
        </div>
      </div>
    </div>
  )
}
