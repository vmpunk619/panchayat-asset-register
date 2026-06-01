// Formatting + CSV helpers.

// Indian-style currency. Values are stored as plain rupees (number).
export function formatINR(n) {
  const v = Number(n) || 0
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

// Compact label used on dashboards: ₹1.2 Cr / ₹3.4 L / ₹5,000.
export function compactINR(n) {
  const v = Number(n) || 0
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr'
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.00$/, '') + ' L'
  return '₹' + v.toLocaleString('en-IN')
}

export function yearOf(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d.getFullYear()
}

export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ---- Geometry (for linear assets like roads / drains / canals) ----

// Great-circle length of a polyline [[lat,lng],...] in kilometres.
export function pathLengthKm(path) {
  if (!Array.isArray(path) || path.length < 2) return 0
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const [la1, lo1] = path[i - 1]
    const [la2, lo2] = path[i]
    const dLa = rad(la2 - la1)
    const dLo = rad(lo2 - lo1)
    const a = Math.sin(dLa / 2) ** 2 +
      Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) ** 2
    total += 2 * R * Math.asin(Math.sqrt(a))
  }
  return total
}

// Middle vertex of a path — used to anchor the sector icon / popup.
export function midpoint(path) {
  if (!Array.isArray(path) || !path.length) return null
  return path[Math.floor(path.length / 2)]
}

export function formatKm(km) {
  if (!km) return '—'
  return km >= 1 ? km.toFixed(2) + ' km' : Math.round(km * 1000) + ' m'
}

// Does this asset have a usable map location? (point with lat/lng, or a line
// with at least two vertices). Imported rows often lack coordinates until
// someone places them on the map via Edit.
export function hasLocation(a) {
  if (a.geometry === 'line' && Array.isArray(a.path) && a.path.length >= 2) return true
  if (a.lat == null || a.lng == null || a.lat === '' || a.lng === '') return false
  return !Number.isNaN(Number(a.lat)) && !Number.isNaN(Number(a.lng))
}

// ---- CSV ----

const CSV_FIELDS = [
  'name', 'sector', 'level', 'block', 'gp', 'village',
  'department', 'fundName', 'amount', 'startDate', 'endDate',
  'geometry', 'lat', 'lng', 'path', 'address', 'notes',
]

function csvCell(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function toCSV(assets) {
  const header = CSV_FIELDS.join(',')
  const rows = assets.map((a) =>
    CSV_FIELDS.map((f) =>
      csvCell(f === 'path' ? (a.path && a.path.length ? JSON.stringify(a.path) : '') : a[f])
    ).join(',')
  )
  return [header, ...rows].join('\n')
}

// Minimal CSV parser that respects quotes.
export function parseCSV(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(cell); cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }

  const nonEmpty = rows.filter((r) => r.some((x) => x.trim() !== ''))
  if (!nonEmpty.length) return []
  const header = nonEmpty[0].map((h) => h.trim())
  return nonEmpty.slice(1).map((r) => {
    const obj = {}
    header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim() })
    let path = null
    if (obj.path) { try { path = JSON.parse(obj.path) } catch { path = null } }
    return {
      ...obj,
      amount: obj.amount ? Number(obj.amount) : 0,
      lat: obj.lat ? Number(obj.lat) : null,
      lng: obj.lng ? Number(obj.lng) : null,
      geometry: obj.geometry || (path ? 'line' : 'point'),
      path,
    }
  })
}

export function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
