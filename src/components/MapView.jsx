import { Fragment, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'
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

// Cluster badge: count in a cyan circle, sized by how many assets it holds.
function clusterIcon(cluster) {
  const n = cluster.getChildCount()
  const size = n >= 100 ? 48 : n >= 10 ? 42 : 36
  return L.divIcon({
    className: '',
    html: `<div class="cluster-pin" style="width:${size}px;height:${size}px">${n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
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
  const photos = Array.isArray(a.photos) ? a.photos : []
  return (
    <div className="popup-asset">
      <b>{a.name || 'Unnamed asset'}</b>
      <div style={{ marginTop: 4 }}>
        <span className="chip" style={{ background: sectorColor(a.sector) }}>
          {sectorIcon(a.sector)} {a.sector}
        </span>
      </div>
      {photos.length > 0 && (
        <div className="popup-photos">
          {photos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={a.name} loading="lazy" />
            </a>
          ))}
        </div>
      )}
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

// Search box overlaid on the map: type, pick a match, the camera flies there.
function MapSearch({ assets, map }) {
  const [q, setQ] = useState('')
  const [openList, setOpenList] = useState(false)

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    return assets
      .filter((a) => [a.name, a.village, a.gp, a.block, a.address]
        .filter(Boolean).join(' ').toLowerCase().includes(needle))
      .slice(0, 8)
  }, [assets, q])

  function go(a) {
    setOpenList(false)
    setQ(a.name)
    if (!map) return
    if (isLine(a)) map.flyToBounds(L.latLngBounds(a.path).pad(0.3), { maxZoom: 15, duration: 1.2 })
    else map.flyTo([Number(a.lat), Number(a.lng)], 15, { duration: 1.2 })
  }

  return (
    <div className="map-search">
      <input
        value={q}
        placeholder="🔍 Find an asset…"
        onChange={(e) => { setQ(e.target.value); setOpenList(true) }}
        onFocus={() => setOpenList(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && matches.length) go(matches[0]) }}
      />
      {openList && matches.length > 0 && (
        <div className="map-search-list">
          {matches.map((a) => (
            <button key={a.id} className="map-search-item" onClick={() => go(a)}>
              <span className="map-search-ico" style={{ background: sectorColor(a.sector) }}>{sectorIcon(a.sector)}</span>
              <span className="map-search-name">{a.name}</span>
              <span className="map-search-where">{[a.gp, a.block].filter(Boolean).join(', ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MapView({ assets, sectorsPresent, onEdit }) {
  const [map, setMap] = useState(null)
  const shown = useMemo(
    () => assets.filter((a) => isLine(a) || (a.lat != null && a.lng != null && !Number.isNaN(Number(a.lat)))),
    [assets]
  )
  const mapped = shown.length

  return (
    <div className="map-wrap" style={{ position: 'relative' }}>
      <MapContainer center={DISTRICT.center} zoom={DISTRICT.zoom} style={{ height: '100%' }} ref={setMap}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToAll assets={shown} />

        {/* Linear assets (roads etc.) draw as a coloured route, hover for summary. */}
        {shown.filter(isLine).map((a) => (
          <Polyline key={'line-' + a.id} positions={a.path}
            pathOptions={{ color: sectorColor(a.sector), weight: 5, opacity: 0.85 }}>
            <Tooltip sticky><Tip a={a} /></Tooltip>
          </Polyline>
        ))}

        {/* Point markers cluster together when the map gets crowded. */}
        <MarkerClusterGroup chunkedLoading maxClusterRadius={45}
          iconCreateFunction={clusterIcon} showCoverageOnHover={false}>
          {shown.map((a) => (
            <Fragment key={a.id}>
              {a.lat != null && a.lng != null && (
                <Marker position={[Number(a.lat), Number(a.lng)]} icon={sectorMarker(a.sector)}>
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}><Tip a={a} /></Tooltip>
                  <Popup><Details a={a} onEdit={onEdit} /></Popup>
                </Marker>
              )}
            </Fragment>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <MapSearch assets={shown} map={map} />

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
