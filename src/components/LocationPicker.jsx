import { useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { DISTRICT } from '../data/howrah.js'

// Teal pin built as a divIcon so we don't depend on Leaflet's default marker
// image assets (which break under Vite bundling).
const pinIcon = L.divIcon({
  className: '',
  html: '<div class="pin-marker">📍</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 24],
})

function ClickHandler({ mode, path, onPoint, onPath }) {
  useMapEvents({
    click(e) {
      const lat = Number(e.latlng.lat.toFixed(6))
      const lng = Number(e.latlng.lng.toFixed(6))
      if (mode === 'line') onPath([...(path || []), [lat, lng]])
      else onPoint(lat, lng)
    },
  })
  return null
}

// Geometry picker. mode 'point' → a single draggable pin.
// mode 'line' → click along the map to trace a route (road / drain / canal).
export default function LocationPicker({ mode = 'point', lat, lng, path = [], onPoint, onPath }) {
  const hasPoint = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
  const firstFix = mode === 'line' && path.length ? path[0] : hasPoint ? [lat, lng] : null
  const center = useMemo(
    () => firstFix || DISTRICT.center,
    // only re-center on first fix, not on every edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Boolean(firstFix)]
  )
  const markerRef = useRef(null)

  return (
    <div className="pick-map">
      <MapContainer center={center} zoom={firstFix ? 14 : DISTRICT.zoom} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler mode={mode} path={path} onPoint={onPoint} onPath={onPath} />

        {mode === 'point' && hasPoint && (
          <Marker
            position={[lat, lng]}
            icon={pinIcon}
            draggable
            ref={markerRef}
            eventHandlers={{
              dragend() {
                const m = markerRef.current
                if (m) {
                  const p = m.getLatLng()
                  onPoint(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)))
                }
              },
            }}
          />
        )}

        {mode === 'line' && path.length > 0 && (
          <>
            {path.length > 1 && (
              <Polyline positions={path} pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.85 }} />
            )}
            {path.map((p, i) => (
              <CircleMarker key={i} center={p} radius={4}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor: '#0f766e', fillOpacity: 1 }} />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  )
}
