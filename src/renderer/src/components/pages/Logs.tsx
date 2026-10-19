import React, { useEffect, useRef } from 'react'
import { useLogStore } from '../../store/log.store'
import type { LogEntry } from '../../../../../shared/types'

const LEVEL_CONFIG = {
  info:    { color: 'text-gray-300', dot: 'bg-gray-500', label: 'INFO' },
  success: { color: 'text-green-400', dot: 'bg-green-500', label: 'OK' },
  warning: { color: 'text-yellow-400', dot: 'bg-yellow-500', label: 'UPOZORENJE' },
  error:   { color: 'text-red-400', dot: 'bg-red-500', label: 'GREŠKA' }
}

export default function Logs(): React.ReactElement {
  const { getFiltered, filter, setFilter, clearLogs, fetchLogs, isLoading } = useLogStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [getFiltered().length])

  const logs = getFiltered()

  const filterButtons = [
    { key: 'all' as const, label: 'Sve' },
    { key: 'success' as const, label: 'Uspjeh' },
    { key: 'info' as const, label: 'Info' },
    { key: 'warning' as const, label: 'Upozorenje' },
    { key: 'error' as const, label: 'Greška' }
  ]

  return (
    <div className="p-6 flex flex-col gap-5 h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-bold text-2xl">Log</h1>
          <p className="text-gray-500 text-sm mt-1">{logs.length} unosa</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} className="btn-ghost flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Osvježi
          </button>
          <button onClick={clearLogs} className="btn-danger flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Obriši Log
          </button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-1 bg-dark-200 rounded-xl p-1 border border-dark-400 w-fit">
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
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="panel flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-2 font-mono text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-3 text-gray-600">
              <div className="w-4 h-4 border border-dark-500 border-t-gold rounded-full animate-spin" />
              Učitavanje logova...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-700">
              Nema log unosa
            </div>
          ) : (
            <>
              {logs.map((entry) => (
                <LogLine key={entry.id} entry={entry} />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LogLine({ entry }: { entry: LogEntry }): React.ReactElement {
  const cfg = LEVEL_CONFIG[entry.level]
  const time = new Date(entry.timestamp).toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  return (
    <div className={`flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-dark-300/30 transition-colors ${cfg.color}`}>
      <span className="text-gray-700 flex-shrink-0 w-20">{time}</span>
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0 mt-1`} />
      <span className="text-gray-600 flex-shrink-0 w-14">[{entry.category}]</span>
      <span className="break-all">{entry.message}</span>
    </div>
  )
}
