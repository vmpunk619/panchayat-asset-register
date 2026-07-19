import { useMemo } from 'react'
import { sectorColor, sectorIcon } from '../data/howrah.js'
import { compactINR, formatINR, yearOf } from '../lib/format.js'
import useCountUp from '../lib/useCountUp.js'

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

function StatCard({ label, value, format, sub, delay = 0 }) {
  const v = useCountUp(value)
  return (
    <div className="card" style={{ animationDelay: `${delay}ms` }}>
      <div className="k">{label}</div>
      <div className="v">{format ? format(v) : Math.round(v)}</div>
      {sub && <div className="muted">{sub}</div>}
    </div>
  )
}

function BarPanel({ title, rows, colorFn, iconFn, max, delay = 0 }) {
  const peak = max || Math.max(1, ...rows.map((r) => r.amount))
  const total = rows.reduce((s, r) => s + r.amount, 0) || 1
  return (
    <div className="panel" style={{ animationDelay: `${delay}ms` }}>
      <h3>{title}</h3>
      {rows.length === 0 && <div className="muted">No data.</div>}
      {rows.map((r, i) => (
        <div className="bar-row" key={r.key}
          title={`${r.key} — ${r.count} asset(s) · ${formatINR(r.amount)} (${Math.round((r.amount / total) * 100)}% of ${title.replace(/^By /, '').toLowerCase()} total)`}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {iconFn ? iconFn(r.key) + ' ' : ''}{r.key}
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: `${(r.amount / peak) * 100}%`,
              background: colorFn ? colorFn(r.key) : '#0f766e',
              animationDelay: `${delay + i * 45}ms`,
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

  if (!assets.length) {
    return (
      <div className="empty">
        <div className="empty-icon">📊</div>
        <b>Nothing to chart yet</b>
        <div style={{ marginTop: 6 }}>Add assets, or loosen the filters on the left.</div>
      </div>
    )
  }

  return (
    <div className="dash">
      <div className="print-only print-head">
        <b>Panchayat Asset Register — Howrah District</b>
        <div>
          Report generated {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          {' '}· {assets.length} asset(s) · {formatINR(totals.amount)} total investment
        </div>
      </div>
      <div className="dash-actions">
        <button className="btn print-btn" onClick={() => window.print()}>🖨️ Print report</button>
      </div>
      <div className="cards">
        <StatCard label="Total assets" value={totals.count} delay={0} />
        <StatCard label="Total investment" value={totals.amount} format={compactINR}
          sub={formatINR(totals.amount)} delay={40} />
        <StatCard label="Blocks covered" value={totals.blocks} delay={80}
          sub="of 14 in Howrah" />
        <StatCard label="Gram Panchayats" value={totals.gps} delay={120} />
        <StatCard label="Sectors active" value={totals.sectors} delay={160} />
      </div>

      <div className="grid2">
        <BarPanel title="By Sector" rows={bySector} colorFn={sectorColor} iconFn={sectorIcon} delay={80} />
        <BarPanel title="By Block / Panchayat Samiti" rows={byBlock} delay={140} />
      </div>
      <div className="grid2">
        <BarPanel title="By Sanctioning Department" rows={byDept} delay={200} />
        <BarPanel title="By Fund / Scheme" rows={byFund} delay={260} />
      </div>
      <div className="grid2">
        <BarPanel title="By Year (construction start)" rows={byYear} delay={320} />
        <div />
      </div>
    </div>
  )
}
