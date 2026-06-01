import { useMemo } from 'react'
import { BLOCK_NAMES, SECTOR_NAMES, FUNDS, DEPARTMENTS, LEVELS } from '../data/howrah.js'
import { yearOf } from '../lib/format.js'
import { lockedLevel } from '../lib/auth.js'

export default function Filters({ filters, setFilters, allAssets, shownCount, user }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  // Non-admin users are pinned to their own tier; Samiti/GP also to their area.
  const lockLevel = user && user.role !== 'admin'
  const lockBlock = user && (user.role === 'samiti' || user.role === 'gp')
  const lockGP = user && user.role === 'gp'

  const gpOptions = useMemo(() => {
    const pool = filters.block
      ? allAssets.filter((a) => a.block === filters.block)
      : allAssets
    return [...new Set(pool.map((a) => a.gp).filter(Boolean))].sort()
  }, [allAssets, filters.block])

  const years = useMemo(() => {
    const ys = new Set()
    allAssets.forEach((a) => {
      const s = yearOf(a.startDate)
      const e = yearOf(a.endDate)
      if (s) ys.add(s)
      if (e) ys.add(e)
    })
    return [...ys].sort((a, b) => a - b)
  }, [allAssets])

  const active =
    filters.q || filters.level || filters.block || filters.gp || filters.sector ||
    filters.fund || filters.department || filters.yearFrom || filters.yearTo

  return (
    <div>
      <div className="section-title">Filters</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Showing <b>{shownCount}</b> of {allAssets.length} assets
        {active && (
          <> · <button className="link" onClick={() => setFilters({})}>clear all</button></>
        )}
      </div>

      <div className="filter-group">
        <label>Search</label>
        <input value={filters.q || ''} onChange={(e) => set('q', e.target.value)}
          placeholder="Name, village, address…" />
      </div>

      {lockLevel ? (
        <div className="filter-group">
          <label>Created by (tier)</label>
          <div className="locked-pill">{lockedLevel(user)}</div>
        </div>
      ) : (
        <div className="filter-group">
          <label>Created by (tier)</label>
          <select value={filters.level || ''} onChange={(e) => set('level', e.target.value)}>
            <option value="">All tiers</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      )}

      {lockBlock ? (
        <div className="filter-group">
          <label>Block / Panchayat Samiti</label>
          <div className="locked-pill">{user.block}</div>
        </div>
      ) : (
        <div className="filter-group">
          <label>Block / Panchayat Samiti</label>
          <select value={filters.block || ''} onChange={(e) => { set('block', e.target.value); set('gp', '') }}>
            <option value="">All blocks</option>
            {BLOCK_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}

      {lockGP ? (
        <div className="filter-group">
          <label>Gram Panchayat</label>
          <div className="locked-pill">{user.gp}</div>
        </div>
      ) : (
        <div className="filter-group">
          <label>Gram Panchayat</label>
          <select value={filters.gp || ''} onChange={(e) => set('gp', e.target.value)} disabled={!gpOptions.length}>
            <option value="">{gpOptions.length ? 'All GPs' : 'No GP data yet'}</option>
            {gpOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}

      <div className="filter-group">
        <label>Sector</label>
        <select value={filters.sector || ''} onChange={(e) => set('sector', e.target.value)}>
          <option value="">All sectors</option>
          {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Sanctioning department</label>
        <select value={filters.department || ''} onChange={(e) => set('department', e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Fund / Scheme</label>
        <select value={filters.fund || ''} onChange={(e) => set('fund', e.target.value)}>
          <option value="">All funds</option>
          {FUNDS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Construction period (year)</label>
        <div className="row2">
          <select value={filters.yearFrom || ''} onChange={(e) => set('yearFrom', e.target.value)}>
            <option value="">From</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.yearTo || ''} onChange={(e) => set('yearTo', e.target.value)}>
            <option value="">To</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="hint">Matches assets active in the selected year range.</div>
      </div>
    </div>
  )
}
