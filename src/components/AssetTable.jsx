import { sectorColor, sectorIcon } from '../data/howrah.js'
import { formatINR, fmtDate, pathLengthKm, formatKm, hasLocation } from '../lib/format.js'

const isLine = (a) => a.geometry === 'line' && Array.isArray(a.path) && a.path.length >= 2

export default function AssetTable({ assets, onEdit }) {
  if (!assets.length) {
    return <div className="empty">No assets match the current filters.</div>
  }
  return (
    <div className="table-wrap">
      <table className="assets">
        <thead>
          <tr>
            <th>Asset</th><th>Sector</th><th>Tier</th><th>Block</th>
            <th>GP</th><th>Village</th><th>Department</th><th>Fund</th><th className="num">Amount</th>
            <th>Start</th><th>End</th><th></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id}>
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
