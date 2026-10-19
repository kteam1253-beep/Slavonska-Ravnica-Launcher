import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useServerStore } from '../../store/server.store'
import type { FsPanelState, SowingTableFarm, SowingTableRow, SowingTablesState } from '../../../../shared/types'
import logoUrl from '../../assets/logo.png'

const EMPTY_STATE: FsPanelState = { configured: false, status: 'unknown', mods: [] }
type PanelAction = 'start' | 'stop' | 'restart'

export default function Panel(): React.ReactElement {
  const { activeServer } = useServerStore()
  const [state, setState] = useState<FsPanelState>(EMPTY_STATE)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<Extract<PanelAction, 'stop' | 'restart'> | null>(null)
  const [sowingState, setSowingState] = useState<SowingTablesState>({ farms: [] })
  const [activeFarmKey, setActiveFarmKey] = useState('farm1')
  const [sowingRows, setSowingRows] = useState<SowingTableRow[]>([])
  const [sowingLabels, setSowingLabels] = useState<string[]>(['1 GOD', '2 GOD', '3 GOD', '4 GOD'])
  const [sowingLoading, setSowingLoading] = useState(false)
  const [sowingWorking, setSowingWorking] = useState<string | null>(null)
  const [sowingError, setSowingError] = useState<string | null>(null)
  const [sowingMessage, setSowingMessage] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    if (!activeServer) return
    setLoading(true)
    setError(null)
    try {
      const response = await window.electron.panelGetState(activeServer.id)
      if (!response.success || !response.data) throw new Error(response.error || 'Panel nije dostupan')
      setState(response.data)
      setSelected(new Set(response.data.mods.filter((mod) => mod.active).map((mod) => mod.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška učitavanja panela')
    } finally {
      setLoading(false)
    }
  }

  const loadSowingTables = async (): Promise<void> => {
    setSowingLoading(true)
    setSowingError(null)
    try {
      const response = await window.electron.sowingTablesGet()
      if (!response.success || !response.data) throw new Error(response.error || 'Tablica sjetve nije dostupna')
      applySowingState(response.data, activeFarmKey)
    } catch (err) {
      setSowingError(err instanceof Error ? err.message : 'Greska ucitavanja tablice sjetve')
    } finally {
      setSowingLoading(false)
    }
  }

  const applySowingState = (nextState: SowingTablesState, preferredFarmKey?: string): void => {
    const farms = nextState.farms || []
    const nextFarm = farms.find((farm) => farm.key === preferredFarmKey) || farms[0]
    setSowingState({ farms })
    if (nextFarm) {
      setActiveFarmKey(nextFarm.key)
      setSowingRows(nextFarm.rows.map((row) => ({ ...row })))
      setSowingLabels([...nextFarm.yearLabels])
    }
  }

  useEffect(() => {
    setState(EMPTY_STATE)
    setSelected(new Set())
    void load()
  }, [activeServer?.id])

  useEffect(() => {
    void loadSowingTables()
  }, [])

  const runAction = async (action: PanelAction): Promise<void> => {
    if (!activeServer) return
    setPendingAction(null)
    setWorking(action)
    setError(null)
    setMessage(null)
    try {
      const response = await window.electron.panelAction(activeServer.id, action)
      if (!response.success) throw new Error(response.error || 'Akcija nije uspjela')
      setMessage(action === 'start' ? 'Server je pokrenut.' : action === 'stop' ? 'Server je zaustavljen.' : 'Restart je poslan.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Akcija nije uspjela')
    } finally {
      setWorking(null)
    }
  }

  const saveMods = async (): Promise<void> => {
    if (!activeServer) return
    setWorking('mods')
    setError(null)
    setMessage(null)
    try {
      const response = await window.electron.panelSaveMods(activeServer.id, [...selected])
      if (!response.success) throw new Error(response.error || 'Modovi nisu spremljeni')
      setMessage('Aktivni modovi su spremljeni. Sada možeš pokrenuti server.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modovi nisu spremljeni')
    } finally {
      setWorking(null)
    }
  }

  const saveSowingTable = async (): Promise<void> => {
    setSowingWorking('save')
    setSowingError(null)
    setSowingMessage(null)
    try {
      const cleanRows = sowingRows
        .map((row) => ({
          field: row.field.trim(),
          year1: row.year1.trim(),
          year2: row.year2.trim(),
          year3: row.year3.trim(),
          year4: row.year4.trim()
        }))
        .filter((row) => row.field)
      const response = await window.electron.sowingTableSave(activeFarmKey, cleanRows, sowingLabels)
      if (!response.success || !response.data) throw new Error(response.error || 'Spremanje nije uspjelo')
      applySowingState(response.data, activeFarmKey)
      setSowingMessage('Tablica je spremljena i Discord je osvjezen.')
    } catch (err) {
      setSowingError(err instanceof Error ? err.message : 'Spremanje nije uspjelo')
    } finally {
      setSowingWorking(null)
    }
  }

  const refreshSowingTable = async (): Promise<void> => {
    setSowingWorking('refresh')
    setSowingError(null)
    setSowingMessage(null)
    try {
      const response = await window.electron.sowingTableRefresh(activeFarmKey)
      if (!response.success || !response.data) throw new Error(response.error || 'Refresh nije uspio')
      applySowingState(response.data, activeFarmKey)
      setSowingMessage('Discord tablica je osvjezena.')
    } catch (err) {
      setSowingError(err instanceof Error ? err.message : 'Refresh nije uspio')
    } finally {
      setSowingWorking(null)
    }
  }

  const filteredMods = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? state.mods.filter((mod) => mod.name.toLowerCase().includes(query)) : state.mods
  }, [state.mods, search])

  const activeMods = filteredMods.filter((mod) => selected.has(mod.id))
  const inactiveMods = filteredMods.filter((mod) => !selected.has(mod.id))
  const activeSowingFarm = sowingState.farms.find((farm) => farm.key === activeFarmKey) || sowingState.farms[0]

  const dirty = state.mods.some((mod) => selected.has(mod.id) !== mod.active)
  const activeCount = selected.size

  if (!activeServer) {
    return <EmptyPanel text="Prvo odaberi aktivni server." />
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel</h1>
          <p className="text-gray-500 text-sm mt-1">{activeServer.name} · GIANTS Dedicated Server</p>
        </div>
        <button onClick={() => void load()} disabled={loading || !!working} className="btn-ghost disabled:opacity-50">
          {loading ? 'Učitavanje...' : 'Osvježi'}
        </button>
      </div>

      {error && <Notice color="red">{error}</Notice>}
      {message && <Notice color="green">{message}</Notice>}

      {!state.configured && !loading ? (
        <div className="panel p-8 text-center">
          <div className="text-gold text-lg font-semibold mb-2">Panel prijava nije konfigurirana</div>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Otvori Serveri → Uredi Server i unesi Panel korisnika i Panel lozinku iz GIANTS web sučelja.
            Preporučuje se zaseban račun samo za launcher.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="panel p-5 lg:col-span-1">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-3">Status igre</div>
              <div className="flex items-center gap-3">
                <span className={state.status === 'running' ? 'dot-online' : state.status === 'stopped' ? 'dot-offline' : 'dot-unknown'} />
                <span className="text-white text-xl font-semibold">
                  {state.status === 'running' ? 'Pokrenut' : state.status === 'stopped' ? 'Zaustavljen' : 'Nepoznat'}
                </span>
              </div>
              <p className="text-gray-600 text-xs mt-3">G-Portal host ostaje uključen; ove akcije upravljaju FS25 igrom.</p>
            </div>

            <div className="panel p-5 lg:col-span-2">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-4">Kontrole servera</div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void runAction('start')}
                  disabled={state.status !== 'stopped' || !!working}
                  className="btn-gold min-w-28 disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {working === 'start' ? 'Pokrećem...' : 'Start'}
                </button>
                <button
                  onClick={() => setPendingAction('stop')}
                  disabled={state.status !== 'running' || !!working}
                  className="btn-danger min-w-28 disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {working === 'stop' ? 'Zaustavljam...' : 'Stop'}
                </button>
                <button
                  onClick={() => setPendingAction('restart')}
                  disabled={state.status !== 'running' || !!working}
                  className="btn-ghost min-w-28 disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {working === 'restart' ? 'Restartam...' : 'Restart'}
                </button>
              </div>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="p-5 border-b border-dark-400 flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div>
                <h2 className="text-white font-semibold">Modovi servera</h2>
                <p className="text-gray-600 text-xs mt-1">Odabrano {activeCount} od {state.mods.length}</p>
              </div>
              <div className="flex gap-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pretraži modove..."
                  className="input-dark w-64 text-sm"
                />
                <button
                  onClick={() => void saveMods()}
                  disabled={!dirty || state.status === 'running' || !!working}
                  className="btn-gold whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {working === 'mods' ? 'Spremam...' : 'Spremi aktivne modove'}
                </button>
              </div>
            </div>

            {state.status === 'running' && (
              <div className="px-5 py-3 bg-orange-500/5 border-b border-orange-500/20 text-orange-300 text-xs">
                Za promjenu aktivnih modova prvo zaustavi server. Nakon spremanja ponovno klikni Start.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-dark-300">
              <ModSection
                title="Aktivni modovi"
                count={activeMods.length}
                mods={activeMods}
                selected={selected}
                disabled={state.status === 'running' || !!working}
                loading={loading}
                emptyText={search ? 'Nema aktivnih modova za ovu pretragu.' : 'Nema aktivnih modova.'}
                onToggle={setSelected}
              />
              <ModSection
                title="Neaktivni modovi"
                count={inactiveMods.length}
                mods={inactiveMods}
                selected={selected}
                disabled={state.status === 'running' || !!working}
                loading={loading}
                emptyText={search ? 'Nema neaktivnih modova za ovu pretragu.' : 'Nema neaktivnih modova.'}
                onToggle={setSelected}
              />
            </div>
          </div>

        </>
      )}

      <SowingTablePanel
        farms={sowingState.farms}
        activeFarm={activeSowingFarm}
        rows={sowingRows}
        yearLabels={sowingLabels}
        loading={sowingLoading}
        working={sowingWorking}
        error={sowingError}
        message={sowingMessage}
        onReload={() => void loadSowingTables()}
        onRefresh={() => void refreshSowingTable()}
        onSave={() => void saveSowingTable()}
        onFarmChange={(farmKey) => {
          const nextFarm = sowingState.farms.find((farm) => farm.key === farmKey)
          if (!nextFarm) return
          setActiveFarmKey(nextFarm.key)
          setSowingRows(nextFarm.rows.map((row) => ({ ...row })))
          setSowingLabels([...nextFarm.yearLabels])
          setSowingError(null)
          setSowingMessage(null)
        }}
        onLabelChange={(index, value) => setSowingLabels((previous) => {
          const next = [...previous]
          next[index] = value
          return next
        })}
        onRowChange={(index, key, value) => setSowingRows((previous) => previous.map((row, rowIndex) => (
          rowIndex === index ? { ...row, [key]: value } : row
        )))}
        onAddRow={() => setSowingRows((previous) => [...previous, { field: '', year1: '', year2: '', year3: '', year4: '' }])}
        onDeleteRow={(index) => setSowingRows((previous) => previous.filter((_, rowIndex) => rowIndex !== index))}
      />

      {pendingAction && (
        <ActionConfirmation
          action={pendingAction}
          serverName={activeServer.name}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void runAction(pendingAction)}
        />
      )}
    </div>
  )
}

interface ModSectionProps {
  title: string
  count: number
  mods: FsPanelState['mods']
  selected: Set<string>
  disabled: boolean
  loading: boolean
  emptyText: string
  onToggle: React.Dispatch<React.SetStateAction<Set<string>>>
}

interface SowingTablePanelProps {
  farms: SowingTableFarm[]
  activeFarm?: SowingTableFarm
  rows: SowingTableRow[]
  yearLabels: string[]
  loading: boolean
  working: string | null
  error: string | null
  message: string | null
  onReload: () => void
  onRefresh: () => void
  onSave: () => void
  onFarmChange: (farmKey: string) => void
  onLabelChange: (index: number, value: string) => void
  onRowChange: (index: number, key: SowingTableColumnKey, value: string) => void
  onAddRow: () => void
  onDeleteRow: (index: number) => void
}

type SowingTableColumnKey = 'field' | 'year1' | 'year2' | 'year3' | 'year4'

function SowingTablePanel({
  farms,
  activeFarm,
  rows,
  yearLabels,
  loading,
  working,
  error,
  message,
  onReload,
  onRefresh,
  onSave,
  onFarmChange,
  onLabelChange,
  onRowChange,
  onAddRow,
  onDeleteRow
}: SowingTablePanelProps): React.ReactElement {
  const disabled = loading || !!working || !activeFarm
  const columns: { key: SowingTableColumnKey; label: string }[] = [
    { key: 'field', label: 'Polje' },
    { key: 'year1', label: yearLabels[0] || '1 GOD' },
    { key: 'year2', label: yearLabels[1] || '2 GOD' },
    { key: 'year3', label: yearLabels[2] || '3 GOD' },
    { key: 'year4', label: yearLabels[3] || '4 GOD' }
  ]

  return (
    <div className="panel overflow-hidden mt-6">
      <div className="p-5 border-b border-dark-400 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div>
          <h2 className="text-white font-semibold">Tablica sjetve</h2>
          <p className="text-gray-600 text-xs mt-1">
            {activeFarm?.channelId ? `Discord kanal: ${activeFarm.channelId}` : 'Discord kanal nije postavljen'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={activeFarm?.key || ''}
            onChange={(event) => onFarmChange(event.target.value)}
            disabled={disabled || farms.length === 0}
            className="input-dark text-sm min-w-36"
          >
            {farms.map((farm) => (
              <option key={farm.key} value={farm.key}>{farm.label}</option>
            ))}
          </select>
          <button onClick={onReload} disabled={disabled} className="btn-ghost disabled:opacity-50">
            {loading ? 'Ucitavanje...' : 'Ucitaj'}
          </button>
          <button onClick={onRefresh} disabled={disabled} className="btn-ghost disabled:opacity-50">
            {working === 'refresh' ? 'Osvjezavam...' : 'Osvjezi Discord'}
          </button>
          <button onClick={onSave} disabled={disabled} className="btn-gold disabled:opacity-50">
            {working === 'save' ? 'Spremam...' : 'Spremi i osvjezi'}
          </button>
        </div>
      </div>

      {error && <div className="mx-5 mt-4"><Notice color="red">{error}</Notice></div>}
      {message && <div className="mx-5 mt-4"><Notice color="green">{message}</Notice></div>}

      <div className="p-5 border-b border-dark-400 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((index) => (
          <label key={index} className="block">
            <span className="text-gray-500 text-xs mb-1 block">Godina {index + 1}</span>
            <input
              value={yearLabels[index] || ''}
              onChange={(event) => onLabelChange(index, event.target.value)}
              disabled={disabled}
              className="input-dark w-full text-sm"
            />
          </label>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.1fr_repeat(4,1fr)_56px] bg-dark-500/40 border-b border-dark-300">
            {columns.map((column) => (
              <div key={column.key} className="px-4 py-3 text-gray-400 text-xs font-semibold uppercase">
                {column.label}
              </div>
            ))}
            <div />
          </div>
          <div className="divide-y divide-dark-300">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1.1fr_repeat(4,1fr)_56px]">
                {columns.map((column) => (
                  <div key={column.key} className="p-2">
                    <input
                      value={row[column.key]}
                      onChange={(event) => onRowChange(index, column.key, event.target.value)}
                      disabled={disabled}
                      className="input-dark w-full text-sm"
                    />
                  </div>
                ))}
                <div className="p-2 flex items-center justify-center">
                  <button
                    onClick={() => onDeleteRow(index)}
                    disabled={disabled}
                    className="w-9 h-9 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                    aria-label="Obrisi red"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
            {!loading && rows.length === 0 && (
              <div className="px-5 py-10 text-center text-gray-600 text-sm">Nema redova za ovu farmu.</div>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-dark-400">
        <button onClick={onAddRow} disabled={disabled} className="btn-ghost disabled:opacity-50">
          Dodaj red
        </button>
      </div>
    </div>
  )
}

function ModSection({ title, count, mods, selected, disabled, loading, emptyText, onToggle }: ModSectionProps): React.ReactElement {
  return (
    <section className="min-w-0">
      <div className="px-5 py-3 bg-dark-500/40 border-b border-dark-300 flex items-center justify-between">
        <h3 className="text-gray-300 text-sm font-semibold">{title}</h3>
        <span className="badge bg-dark-400 text-gray-400">{count}</span>
      </div>
      <div className="h-[390px] overflow-y-auto divide-y divide-dark-300">
        {mods.map((mod) => (
          <label key={mod.id} className="flex items-center gap-3 px-5 py-3 table-row-hover cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(mod.id)}
              disabled={disabled}
              onChange={() => onToggle((previous) => {
                const next = new Set(previous)
                next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id)
                return next
              })}
              className="w-4 h-4 accent-yellow-400 shrink-0"
            />
            <span className="text-gray-300 text-sm font-mono break-all">{mod.name}</span>
          </label>
        ))}
        {!loading && mods.length === 0 && (
          <div className="h-full min-h-32 flex items-center justify-center px-6 text-center text-gray-600 text-sm">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  )
}

function ActionConfirmation({ action, serverName, onCancel, onConfirm }: {
  action: 'stop' | 'restart'
  serverName: string
  onCancel: () => void
  onConfirm: () => void
}): React.ReactElement {
  const isStop = action === 'stop'
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="panel w-full max-w-md overflow-hidden shadow-2xl" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.85)' }}>
        <div className="px-5 py-4 border-b border-dark-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
              <img src={logoUrl} alt="SR" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Potvrda akcije</div>
              <div className="text-gray-500 text-xs">{serverName}</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors" aria-label="Zatvori">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          <h2 className="text-white text-lg font-semibold mb-2">
            {isStop ? 'Zaustaviti server u igri?' : 'Ponovno pokrenuti server u igri?'}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {isStop
              ? 'Igrači će izgubiti pristup serveru dok ga ponovno ne pokreneš. G-Portal host ostat će uključen.'
              : 'Server će se kratko zaustaviti i automatski ponovno pokrenuti.'}
          </p>
        </div>
        <div className="px-5 py-4 border-t border-dark-400 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">Odustani</button>
          <button onClick={onConfirm} className={isStop ? 'btn-danger' : 'btn-gold'}>
            {isStop ? 'Zaustavi server' : 'Ponovno pokreni'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Notice({ color, children }: { color: 'red' | 'green'; children: React.ReactNode }): React.ReactElement {
  return (
    <div className={`mb-4 px-4 py-3 rounded-xl border text-sm ${color === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-green-500/10 border-green-500/30 text-green-300'}`}>
      {children}
    </div>
  )
}

function EmptyPanel({ text }: { text: string }): React.ReactElement {
  return <div className="h-full flex items-center justify-center text-gray-600">{text}</div>
}
