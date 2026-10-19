import React from 'react'
import type { Page } from '../../App'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import Servers from '../pages/Servers'
import Dashboard from '../pages/Dashboard'
import Mods from '../pages/Mods'
import Settings from '../pages/Settings'
import Admin from '../pages/Admin'
import Logs from '../pages/Logs'
import Panel from '../pages/Panel'
import DownloadBar from '../download/DownloadBar'

interface LayoutProps {
  currentPage: Page
  setCurrentPage: (page: Page) => void
}

export default function Layout({ currentPage, setCurrentPage }: LayoutProps): React.ReactElement {
  const renderPage = (): React.ReactElement => {
    switch (currentPage) {
      case 'servers': return <Servers />
      case 'dashboard': return <Dashboard setPage={setCurrentPage} />
      case 'mods': return <Mods />
      case 'settings': return <Settings />
      case 'admin': return <Admin />
      case 'logs': return <Logs />
      case 'panel': return <Panel />
      default: return <Dashboard setPage={setCurrentPage} />
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-dark overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {renderPage()}
          </div>
          <DownloadBar />
        </main>
      </div>
    </div>
  )
}
