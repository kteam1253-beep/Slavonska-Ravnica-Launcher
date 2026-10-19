import React, { useEffect, useState } from 'react'
import { useAuthStore } from './store/auth.store'
import { useLogStore } from './store/log.store'
import { useDownloadStore } from './store/download.store'
import { useUploadStore } from './store/upload.store'
import DiscordLogin from './components/auth/DiscordLogin'
import AccessDenied from './components/auth/AccessDenied'
import Layout from './components/layout/Layout'
import UpdateOverlay, {
  type UpdateInfo,
  type UpdateProgressInfo,
  type UpdateStage
} from './components/update/UpdateOverlay'
import logoUrl from './assets/logo.png'
import type { LogEntry, DownloadItem, DownloadProgress, UploadItem } from '../../../shared/types'
import { I18nProvider } from './i18n'

export type Page = 'servers' | 'dashboard' | 'mods' | 'settings' | 'admin' | 'logs' | 'panel'

function AppContent(): React.ReactElement {
  const { isAuthenticated, hasRequiredRole, isLoading, checkSession } = useAuthStore()
  const { addLog } = useLogStore()
  const { updateProgress: updateDownloadProgress, setQueue } = useDownloadStore()
  const { setQueue: setUploadQueue, updateItem: updateUploadItem } = useUploadStore()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [appVersion, setAppVersion] = useState('')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateStage, setUpdateStage] = useState<UpdateStage | null>(null)
  const [updateProgress, setUpdateProgress] = useState<UpdateProgressInfo | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Boot: check existing session
  useEffect(() => {
    checkSession()
    window.electron.getAppVersion().then(setAppVersion).catch(() => setAppVersion(''))
  }, [])

  // Subscribe to IPC events
  useEffect(() => {
    const onLog = (entry: LogEntry): void => addLog(entry)
    const onProgress = (progress: DownloadProgress): void => updateDownloadProgress(progress)
    const onQueueUpdate = (queue: DownloadItem[]): void => setQueue(queue)
    const onUploadQueue = (queue: UploadItem[]): void => setUploadQueue(queue)
    const onUploadProgress = (item: UploadItem): void => updateUploadItem(item)
    const onUpdateAvailable = (info: UpdateInfo): void => {
      setUpdateInfo(info)
      setUpdateProgress(null)
      setUpdateError(null)
      setUpdateStage('available')
    }
    const onUpdateProgress = (progress: UpdateProgressInfo): void => {
      setUpdateProgress(progress)
      setUpdateStage('downloading')
    }
    const onUpdateDownloaded = (info: UpdateInfo): void => {
      setUpdateInfo(info)
      setUpdateProgress({ percent: 100 })
      setUpdateStage('downloaded')
    }

    window.electron.on('log:new-entry', onLog as never)
    window.electron.on('download:progress', onProgress as never)
    window.electron.on('download:queue-update', onQueueUpdate as never)
    window.electron.on('upload:queue-update', onUploadQueue as never)
    window.electron.on('upload:progress', onUploadProgress as never)
    window.electron.on('update:available', onUpdateAvailable as never)
    window.electron.on('update:progress', onUpdateProgress as never)
    window.electron.on('update:downloaded', onUpdateDownloaded as never)

    return () => {
      window.electron.off('log:new-entry', onLog as never)
      window.electron.off('download:progress', onProgress as never)
      window.electron.off('download:queue-update', onQueueUpdate as never)
      window.electron.off('upload:queue-update', onUploadQueue as never)
      window.electron.off('upload:progress', onUploadProgress as never)
      window.electron.off('update:available', onUpdateAvailable as never)
      window.electron.off('update:progress', onUpdateProgress as never)
      window.electron.off('update:downloaded', onUpdateDownloaded as never)
    }
  }, [])

  const handleDownloadUpdate = async (): Promise<void> => {
    try {
      setUpdateStage('downloading')
      setUpdateProgress({ percent: 0 })
      await window.electron.downloadUpdate()
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Greška preuzimanja update-a')
      setUpdateStage('error')
    }
  }

  const handleInstallUpdate = async (): Promise<void> => {
    await window.electron.installUpdate()
  }

  // Loading screen
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-dark flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-dark-400 border-t-gold animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={logoUrl} alt="SR" className="w-11 h-11 object-contain animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-gold font-bold text-2xl tracking-widest mb-1">SR LAUNCHER</div>
          <div className="text-gray-500 text-sm">Učitavanje...</div>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <DiscordLogin />
  }

  // Authenticated but no role
  if (!hasRequiredRole) {
    return <AccessDenied />
  }

  return (
    <>
      <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {updateStage && updateInfo && (
        <UpdateOverlay
          stage={updateStage}
          info={updateInfo}
          currentVersion={appVersion}
          progress={updateProgress}
          error={updateError}
          onDownload={handleDownloadUpdate}
          onInstall={handleInstallUpdate}
          onDismiss={() => setUpdateStage(null)}
        />
      )}
    </>
  )
}

export default function App(): React.ReactElement {
  return <I18nProvider><AppContent /></I18nProvider>
}
