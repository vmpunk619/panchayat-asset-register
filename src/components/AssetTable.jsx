import { useMemo, useState } from 'react'
import { sectorColor, sectorIcon } from '../data/howrah.js'
import { formatINR, fmtDate, pathLengthKm, formatKm, hasLocation } from '../lib/format.js'

const isLine = (a) => a.geometry === 'line' && Array.isArray(a.path) && a.path.length >= 2

const NUMERIC = new Set(['amount'])

function cmp(a, b, key) {
  const av = a[key]
  const bv = b[key]
  // Empty values always sink to the bottom, regardless of direction.
  const aEmpty = av == null || av === ''
  const bEmpty = bv == null || bv === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (NUMERIC.has(key)) return (Number(av) || 0) - (Number(bv) || 0)
  return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
}

export default function AssetTable({ assets, onEdit }) {
  const [sort, setSort] = useState({ key: null, dir: 1 })

  const sorted = useMemo(() => {
    if (!sort.key) return assets
    const arr = [...assets]
    arr.sort((a, b) => {
      const c = cmp(a, b, sort.key)
      // keep empties last even when descending
      if (c === 0) return 0
      const aEmpty = a[sort.key] == null || a[sort.key] === ''
      const bEmpty = b[sort.key] == null || b[sort.key] === ''
      if (aEmpty || bEmpty) return c
      return c * sort.dir
    })
    return arr
  }, [assets, sort])

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }))
  }

  function Th({ k, children, className }) {
    const active = sort.key === k
    return (
      <th className={'sortable' + (className ? ' ' + className : '')}
        onClick={() => toggleSort(k)}
        title="Click to sort">
        {children}
        <span className="sort-ind">{active ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span>
      </th>
    )
  }

  if (!assets.length) {
    return (
      <div className="empty">
        <div className="empty-icon">🗂️</div>
        <b>No assets match the current filters</b>
        <div style={{ marginTop: 6 }}>Try clearing a filter, or add a new asset from the top bar.</div>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="assets">
        <thead>
          <tr>
            <Th k="name">Asset</Th>
            <Th k="sector">Sector</Th>
            <Th k="level">Tier</Th>
            <Th k="block">Block</Th>
            <Th k="gp">GP</Th>
            <Th k="village">Village</Th>
            <Th k="department">Department</Th>
            <Th k="fundName">Fund</Th>
            <Th k="amount" className="num">Amount</Th>
            <Th k="startDate">Start</Th>
            <Th k="endDate">End</Th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a, i) => (
            <tr key={a.id} style={{ animationDelay: `${Math.min(i, 14) * 26}ms` }}>
              <td>
                <b>{a.name}</b>
                {isLine(a) && <span className="muted"> · 🛣️ {formatKm(pathLengthKm(a.path))}</span>}
                {!hasLocation(a) && <span className="warn-chip">⚠ no location</span>}
              </td>
              <td><span className="chip" style={{ background: sectorColor(a.sector) }}>{sectorIcon(a.sector)} {a.sector}</span></td>
              <td>{(a.level || '').replace(/ \(.*\)/, '')}</td>
              <td>{a.block}</td>
              <td>{a.gp || '—'}</td>
              <td>{a.village || '—'}</td>
              <td>{a.department || '—'}</td>
              <td>{a.fundName || '—'}</td>
              <td className="num">{formatINR(a.amount)}</td>
              <td>{fmtDate(a.startDate)}</td>
              <td>{fmtDate(a.endDate)}</td>
              <td>
                {hasLocation(a)
                  ? <button className="btn sm" onClick={() => onEdit(a)}>Edit</button>
                  : <button className="btn sm set-loc" onClick={() => onEdit(a)}>📍 Set location</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
