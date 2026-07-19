import { useEffect, useMemo, useRef, useState } from 'react'
import Filters from './components/Filters.jsx'
import MapView from './components/MapView.jsx'
import Dashboard from './components/Dashboard.jsx'
import AssetTable from './components/AssetTable.jsx'
import AssetForm from './components/AssetForm.jsx'
import Login from './components/Login.jsx'
import UserAdmin from './components/UserAdmin.jsx'
import LiveView from './components/LiveView.jsx'
import { isConfigured } from './lib/supabaseClient.js'
import { listAssets, saveAsset, deleteAsset, clearAll } from './lib/storage.js'
import {
  loadSession, onAuthChange, logout, currentUser,
  scopeAssets, canManageUsers, lockedLevel, roleLabel,
} from './lib/auth.js'
import { SAMPLE_ASSETS } from './lib/sample.js'
import { toCSV, parseCSV, download, yearOf, hasLocation } from './lib/format.js'

function inYearRange(a, from, to) {
  if (!from && !to) return true
  const s = yearOf(a.startDate)
  const e = yearOf(a.endDate)
  if (s == null && e == null) return false
  const aLo = s ?? e
  const aHi = e ?? s
  const lo = from ? Number(from) : -Infinity
  const hi = to ? Number(to) : Infinity
  return aHi >= lo && aLo <= hi
}

function Centered({ children }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">🏛️</div>
          <div><h1>Panchayat Asset Register</h1><div className="muted">Howrah District</div></div>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => currentUser())
  const [authReady, setAuthReady] = useState(false)
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState({})
  const [view, setView] = useState('map')
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const fileRef = useRef(null)
  const toastTimer = useRef(null)

  // Small self-dismissing feedback pill (bottom-centre).
  function notify(msg, kind = 'ok') {
    clearTimeout(toastTimer.current)
    setToast({ msg, kind, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Resolve the session once, and keep it in sync with sign-in/out.
  useEffect(() => {
    if (!isConfigured) { setAuthReady(true); return }
    let mounted = true
    loadSession()
      .then((p) => { if (mounted) setUser(p) })
      .catch(() => {})
      .finally(() => { if (mounted) setAuthReady(true) })
    const unsub = onAuthChange((p) => { if (mounted) setUser(p) })
    return () => { mounted = false; unsub() }
  }, [])

  async function reload() {
    try { setAssets(await listAssets()); setLoadError('') }
    catch (e) { setLoadError(e.message) }
  }

  // Load assets whenever the signed-in user changes.
  useEffect(() => {
    if (!user) { setAssets([]); return }
    let mounted = true
    setLoading(true)
    listAssets()
      .then((a) => { if (mounted) { setAssets(a); setLoadError('') } })
      .catch((e) => { if (mounted) setLoadError(e.message) })
      .finally(() => { if (mounted) setLoading(false) })
  }, [user])

  const visible = useMemo(() => scopeAssets(user, assets), [user, assets])
  const admin = canManageUsers(user)

  // The Live board keeps itself fresh: re-fetch periodically while it's shown.
  useEffect(() => {
    if (view !== 'live' || !user) return
    const id = setInterval(() => { reload() }, 45000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user])

  const filtered = useMemo(() => {
    const q = (filters.q || '').trim().toLowerCase()
    return visible.filter((a) => {
      if (filters.level && a.level !== filters.level) return false
      if (filters.block && a.block !== filters.block) return false
      if (filters.gp && a.gp !== filters.gp) return false
      if (filters.sector && a.sector !== filters.sector) return false
      if (filters.department && a.department !== filters.department) return false
      if (filters.fund && a.fundName !== filters.fund) return false
      if (!inYearRange(a, filters.yearFrom, filters.yearTo)) return false
      if (q) {
        const hay = [a.name, a.village, a.address, a.gp, a.block].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [visible, filters])

  const sectorsPresent = useMemo(
    () => [...new Set(filtered.map((a) => a.sector).filter(Boolean))].sort(),
    [filtered]
  )
  const gpSuggestions = useMemo(
    () => [...new Set(visible.map((a) => a.gp).filter(Boolean))],
    [visible]
  )
  const needsLocation = useMemo(() => visible.filter((a) => !hasLocation(a)), [visible])

  const formScope = useMemo(() => {
    if (!user || user.role === 'admin') return {}
    const s = { lockLevel: true, level: lockedLevel(user) }
    if (user.role === 'samiti') { s.lockBlock = true; s.block = user.block }
    if (user.role === 'gp') { s.lockBlock = true; s.block = user.block; s.lockGP = true; s.gp = user.gp }
    return s
  }, [user])

  async function handleSave(data) {
    const stamped = data.id
      ? data
      : { ...data, createdByName: user.name, createdByRole: user.role }
    try {
      await saveAsset(stamped)
      await reload()
      setEditing(null)
      notify(data.id ? 'Asset updated ✓' : 'Asset added ✓')
    } catch (e) {
      alert('Could not save: ' + e.message)
    }
  }
  async function handleDelete(id) {
    if (!confirm('Delete this asset permanently?')) return
    try { await deleteAsset(id); await reload(); setEditing(null); notify('Asset deleted', 'warn') }
    catch (e) { alert('Could not delete: ' + e.message) }
  }
  async function handleLoadSample() {
    if (assets.length && !confirm('Add 8 sample assets to the register?')) return
    try {
      for (const a of SAMPLE_ASSETS) await saveAsset({ ...a, createdByName: user.name, createdByRole: user.role })
      await reload()
      notify(`${SAMPLE_ASSETS.length} sample assets added ✓`)
    } catch (e) { alert('Could not add samples: ' + e.message) }
  }
  function handleExportCSV() {
    download('howrah-assets.csv', toCSV(filtered), 'text/csv')
    notify(`Exported ${filtered.length} asset(s) to CSV ✓`)
  }
  function handleTemplate() {
    const examples = [
      { name: 'EXAMPLE 1 (delete this row) – Sub-centre building', sector: 'Healthcare',
        level: 'Gram Panchayat (GP)', block: 'Domjur', gp: 'Salap', village: 'Salap',
        department: 'Health & Family Welfare', fundName: '15th Finance Commission (Tied)',
        amount: 1500000, startDate: '2024-01-10', endDate: '2024-08-20',
        geometry: 'point', lat: 22.625, lng: 88.19, path: null,
        address: 'Salap More', notes: 'Add your own rows below; keep the header row' },
      { name: 'EXAMPLE 2 (delete this row) – set location later', sector: 'Education',
        level: 'Gram Panchayat (GP)', block: 'Domjur', gp: 'Salap', village: '',
        department: 'School Education', fundName: 'MGNREGA (100 Days Work)',
        amount: 600000, startDate: '2023-11-01', endDate: '2024-02-15',
        geometry: 'point', lat: '', lng: '', path: null,
        address: '', notes: 'Leave lat/lng blank — place on the map later via Edit' },
      { name: 'EXAMPLE 3 (delete this row) – rural road', sector: 'Roads & Bridges',
        level: 'Panchayat Samiti (Block)', block: 'Bagnan-I', gp: 'Bagnan', village: 'Bagnan',
        department: 'Public Works Department (PWD)', fundName: 'PMGSY (Rural Roads)',
        amount: 4200000, startDate: '2023-08-12', endDate: '2024-04-18',
        geometry: 'line', lat: 22.4236, lng: 87.9768, path: [[22.4205, 87.97], [22.4236, 87.9768]],
        address: 'Bagnan Bazar to Station', notes: 'For roads use geometry=line; otherwise geometry=point' },
    ]
    download('howrah-asset-template.csv', toCSV(examples), 'text/csv')
  }
  function handleBackup() {
    download('howrah-assets-backup.json', JSON.stringify(assets, null, 2), 'application/json')
  }
  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const text = String(reader.result)
        let rows = file.name.toLowerCase().endsWith('.json')
          ? (Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [])
          : parseCSV(text)
        rows = rows.filter((r) => {
          const nm = (r.name || '').trim()
          return nm && !nm.toUpperCase().startsWith('EXAMPLE')
        })
        if (!rows.length) { alert('No data rows found (blank and EXAMPLE rows are ignored).'); return }
        if (!confirm(`Add ${rows.length} asset(s) to the register?`)) return
        const lvl = lockedLevel(user)
        let ok = 0, fail = 0
        for (const r of rows) {
          const row = { ...r, id: undefined, createdByName: user.name, createdByRole: user.role }
          if (user.role !== 'admin') {
            if (lvl) row.level = lvl
            if (user.role === 'samiti' || user.role === 'gp') row.block = user.block
            if (user.role === 'gp') row.gp = user.gp
          }
          try { await saveAsset(row); ok++ } catch { fail++ }
        }
        await reload()
        if (fail) alert(`Imported ${ok} asset(s), ${fail} failed (check tier/jurisdiction & required fields).`)
        else notify(`Imported ${ok} asset(s) ✓`)
      } catch (err) {
        alert('Could not parse file: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  async function handleClearAll() {
    if (!confirm('Erase ALL assets you can access? Export a backup first if needed.')) return
    try { await clearAll(); await reload(); notify('All data erased', 'warn') }
    catch (e) { alert('Could not erase: ' + e.message) }
  }
  async function handleLogout() {
    await logout(); setUser(null); setView('map'); setFilters({}); setEditing(null)
  }

  // ---- Gates ----
  if (!isConfigured) {
    return (
      <Centered>
        <h2>Connect Supabase</h2>
        <p className="muted">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in a
          <code> .env</code> file (local) or in your Vercel project settings, then reload.
          See <b>SETUP.md</b> for the full steps.
        </p>
      </Centered>
    )
  }
  if (!authReady) return <Centered><div className="muted">Loading…</div></Centered>
  if (!user) return <Login onAuthed={setUser} />

  const jurisdiction =
    user.role === 'gp' ? `${user.block} › ${user.gp}`
      : user.role === 'samiti' ? user.block
        : 'Entire district'

  const tabs = ['map', 'dashboard', 'table', 'live', ...(admin ? ['users'] : [])]
  const tabLabel = { map: 'Map', dashboard: 'Dashboard', table: 'Table', live: '🔴 Live', users: 'Users' }

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Panchayat Asset Register</h1>
          <div className="sub">Howrah District · GP · Panchayat Samiti · Zilla Parishad</div>
        </div>
        <div className="tabs" style={{ marginLeft: 18 }}>
          {tabs.map((v) => (
            <button key={v} className={'tab' + (view === v ? ' active' : '')} onClick={() => setView(v)}>
              {tabLabel[v]}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={handleExportCSV}>Export CSV</button>
        <button className="btn ghost sm" onClick={handleTemplate}>Template</button>
        <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>Import</button>
        {admin && <button className="btn ghost sm" onClick={handleBackup}>Backup</button>}
        <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={handleImport} />
        <button className="btn" onClick={() => setEditing({})}>+ Add asset</button>
        <div className="userbox">
          <div className="uname">{user.name}</div>
          <div className="urole">{roleLabel(user.role)} · {jurisdiction}</div>
        </div>
        <button className="btn ghost sm" onClick={handleLogout}>Logout</button>
      </div>

      <div className="body">
        {view !== 'users' && view !== 'live' && (
          <aside className="sidebar">
            {loadError && <div className="warn-banner">⚠ {loadError}</div>}
            {needsLocation.length > 0 && (
              <div className="warn-banner">
                ⚠ <b>{needsLocation.length}</b> asset(s) have no map location.{' '}
                <button className="link" onClick={() => setView('table')}>Open the Table</button> and click
                <b> Edit</b> to place each on the map.
              </div>
            )}
            <Filters filters={filters} setFilters={setFilters} allAssets={visible} shownCount={filtered.length} user={user} />
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '16px 0' }} />
            <div className="muted" style={{ lineHeight: 1.6 }}>
              {loading ? <><span className="spinner" /> Loading assets…</> : 'Data is stored in your Supabase project.'}
              {admin && !loading && assets.length === 0 && (
                <> <button className="link" onClick={handleLoadSample}>Load sample data</button> to explore.</>
              )}
            </div>
            {admin && assets.length > 0 && (
              <button className="btn danger sm" style={{ marginTop: 12 }} onClick={handleClearAll}>Erase all data</button>
            )}
          </aside>
        )}

        <main className="main view-fade" key={view}>
          {view === 'map' && <MapView assets={filtered} sectorsPresent={sectorsPresent} onEdit={setEditing} />}
          {view === 'dashboard' && <Dashboard assets={filtered} />}
          {view === 'table' && <AssetTable assets={filtered} onEdit={setEditing} />}
          {view === 'live' && <LiveView assets={visible} />}
          {view === 'users' && admin && <UserAdmin currentUser={user} />}
        </main>
      </div>

      {toast && <div key={toast.key} className={'toast ' + toast.kind}>{toast.msg}</div>}

      {editing && (
        <AssetForm
          initial={editing.id ? editing : null}
          scope={formScope}
          gpSuggestions={gpSuggestions}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
