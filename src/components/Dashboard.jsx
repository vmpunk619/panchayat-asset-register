import { useMemo } from 'react'
import { sectorColor, sectorIcon } from '../data/howrah.js'
import { compactINR, formatINR, yearOf } from '../lib/format.js'

function aggregate(assets, keyFn) {
  const map = new Map()
  assets.forEach((a) => {
    const key = keyFn(a)
    if (!key) return
    const cur = map.get(key) || { key, count: 0, amount: 0 }
    cur.count += 1
    cur.amount += Number(a.amount) || 0
    map.set(key, cur)
  })
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

function BarPanel({ title, rows, colorFn, iconFn, max }) {
  const peak = max || Math.max(1, ...rows.map((r) => r.amount))
  return (
    <div className="panel">
      <h3>{title}</h3>
      {rows.length === 0 && <div className="muted">No data.</div>}
      {rows.map((r) => (
        <div className="bar-row" key={r.key}>
          <div title={r.key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {iconFn ? iconFn(r.key) + ' ' : ''}{r.key}
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: `${(r.amount / peak) * 100}%`,
              background: colorFn ? colorFn(r.key) : '#0f766e',
            }} />
          </div>
          <div className="bar-val">{r.count} · {compactINR(r.amount)}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ assets }) {
  const totals = useMemo(() => {
    const amount = assets.reduce((s, a) => s + (Number(a.amount) || 0), 0)
    const blocks = new Set(assets.map((a) => a.block).filter(Boolean)).size
    const sectors = new Set(assets.map((a) => a.sector).filter(Boolean)).size
    const gps = new Set(assets.map((a) => a.gp).filter(Boolean)).size
    return { count: assets.length, amount, blocks, sectors, gps }
  }, [assets])

  const bySector = useMemo(() => aggregate(assets, (a) => a.sector), [assets])
  const byBlock = useMemo(() => aggregate(assets, (a) => a.block), [assets])
  const byDept = useMemo(() => aggregate(assets, (a) => a.department), [assets])
  const byFund = useMemo(() => aggregate(assets, (a) => a.fundName), [assets])
  const byYear = useMemo(
    () => aggregate(assets, (a) => yearOf(a.startDate))
      .sort((a, b) => Number(a.key) - Number(b.key)),
    [assets]
  )

  return (
    <div className="dash">
      <div className="cards">
        <div className="card"><div className="k">Total assets</div><div className="v">{totals.count}</div></div>
        <div className="card"><div className="k">Total investment</div><div className="v">{compactINR(totals.amount)}</div>
          <div className="muted">{formatINR(totals.amount)}</div></div>
        <div className="card"><div className="k">Blocks covered</div><div className="v">{totals.blocks}<span className="muted" style={{ fontSize: 14 }}> / 14</span></div></div>
        <div className="card"><div className="k">Gram Panchayats</div><div className="v">{totals.gps}</div></div>
        <div className="card"><div className="k">Sectors active</div><div className="v">{totals.sectors}</div></div>
      </div>

      <div className="grid2">
        <BarPanel title="By Sector" rows={bySector} colorFn={sectorColor} iconFn={sectorIcon} />
        <BarPanel title="By Block / Panchayat Samiti" rows={byBlock} />
      </div>
      <div className="grid2">
        <BarPanel title="By Sanctioning Department" rows={byDept} />
        <BarPanel title="By Fund / Scheme" rows={byFund} />
      </div>
      <div className="grid2">
        <BarPanel title="By Year (construction start)" rows={byYear} />
        <div />
      </div>
    </div>
  )
}
