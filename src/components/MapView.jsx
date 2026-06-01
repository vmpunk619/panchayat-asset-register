import { Fragment, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { DISTRICT, sectorColor, sectorIcon } from '../data/howrah.js'
import { compactINR, fmtDate, pathLengthKm, formatKm } from '../lib/format.js'

// Build (and cache) a circular badge marker carrying the sector's icon.
const ICON_CACHE = {}
function sectorMarker(sector) {
  if (ICON_CACHE[sector]) return ICON_CACHE[sector]
  const color = sectorColor(sector)
  const emoji = sectorIcon(sector)
  const icon = L.divIcon({
    className: '',
    html: `<div class="sector-pin" style="background:${color}">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    tooltipAnchor: [0, -16],
  })
  ICON_CACHE[sector] = icon
  return icon
}

const isLine = (a) => a.geometry === 'line' && Array.isArray(a.path) && a.path.length >= 2

// Re-fit the map to everything currently shown (points + route vertices).
function FitToAll({ assets }) {
  const map = useMap()
  const coords = []
  assets.forEach((a) => {
    if (isLine(a)) a.path.forEach((p) => coords.push(p))
    else if (a.lat != null && a.lng != null) coords.push([Number(a.lat), Number(a.lng)])
  })
  const key = assets.map((a) => a.id).join('|')
  useEffect(() => {
    if (!coords.length) return
    map.fitBounds(L.latLngBounds(coords).pad(0.2), { maxZoom: 14, animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

function Tip({ a }) {
  return (
    <div className="tip">
      <b>{a.name || 'Unnamed asset'}</b>
      <div>{sectorIcon(a.sector)} {a.sector} · <b>{compactINR(a.amount)}</b></div>
      <div>{[a.gp, a.block].filter(Boolean).join(', ')}</div>
      {isLine(a) && <div>🛣️ Route length: <b>{formatKm(pathLengthKm(a.path))}</b></div>}
      {a.department && <div className="muted">{a.department}</div>}
      <div className="muted">{fmtDate(a.startDate)} → {fmtDate(a.endDate)}</div>
    </div>
  )
}

function Details({ a, onEdit }) {
  return (
    <div className="popup-asset">
      <b>{a.name || 'Unnamed asset'}</b>
      <div style={{ marginTop: 4 }}>
        <span className="chip" style={{ background: sectorColor(a.sector) }}>
          {sectorIcon(a.sector)} {a.sector}
        </span>
      </div>
      <div className="meta">
        <div>{a.level}</div>
        <div>{[a.gp, a.block].filter(Boolean).join(', ')}</div>
        {a.village && <div>Village: {a.village}</div>}
        {isLine(a) && <div>Route length: <b>{formatKm(pathLengthKm(a.path))}</b></div>}
        {a.department && <div>Dept: {a.department}</div>}
        <div><b>{compactINR(a.amount)}</b>{a.fundName ? ' · ' + a.fundName : ''}</div>
        <div>{fmtDate(a.startDate)} → {fmtDate(a.endDate)}</div>
        {a.address && <div className="muted">{a.address}</div>}
      </div>
      <button className="link" style={{ marginTop: 6 }} onClick={() => onEdit(a)}>
        Edit / view details
      </button>
    </div>
  )
}

export default function MapView({ assets, sectorsPresent, onEdit }) {
  const shown = useMemo(
    () => assets.filter((a) => isLine(a) || (a.lat != null && a.lng != null && !Number.isNaN(Number(a.lat)))),
    [assets]
  )
  const mapped = shown.length

  return (
    <div className="map-wrap" style={{ position: 'relative' }}>
      <MapContainer center={DISTRICT.center} zoom={DISTRICT.zoom} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToAll assets={shown} />

        {shown.map((a) => (
          <Fragment key={a.id}>
            {/* Linear assets (roads etc.) draw as a coloured route, hover for summary. */}
            {isLine(a) && (
              <Polyline positions={a.path}
                pathOptions={{ color: sectorColor(a.sector), weight: 5, opacity: 0.85 }}>
                <Tooltip sticky><Tip a={a} /></Tooltip>
              </Polyline>
            )}
            {/* A sector icon sits at the point (or the route's midpoint) for click + legend. */}
            {a.lat != null && a.lng != null && (
              <Marker position={[Number(a.lat), Number(a.lng)]} icon={sectorMarker(a.sector)}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1}><Tip a={a} /></Tooltip>
                <Popup><Details a={a} onEdit={onEdit} /></Popup>
              </Marker>
            )}
          </Fragment>
        ))}
      </MapContainer>

      <div className="legend">
        <h4>Sectors ({mapped} mapped)</h4>
        {sectorsPresent.length === 0 && <div className="muted">No assets match filters.</div>}
        {sectorsPresent.map((s) => (
          <div className="item" key={s}>
            <span className="legend-icon" style={{ background: sectorColor(s) }}>{sectorIcon(s)}</span>
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}
