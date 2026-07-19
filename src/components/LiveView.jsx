import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { DISTRICT, sectorColor, sectorIcon } from '../data/howrah.js'
import { compactINR, fmtDate, hasLocation } from '../lib/format.js'
import useCountUp from '../lib/useCountUp.js'

const SPOTLIGHT_MS = 7000

// Glowing pulse-dot markers, coloured by sector (cached per sector+size).
const DOT_CACHE = {}
function dotIcon(sector, big) {
  const key = sector + (big ? '#big' : '')
  if (DOT_CACHE[key]) return DOT_CACHE[key]
  const size = big ? 22 : 14
  const icon = L.divIcon({
    className: '',
    html: `<span class="live-dot${big ? ' big' : ''}" style="--c:${sectorColor(sector)}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
  DOT_CACHE[key] = icon
  return icon
}

const isLine = (a) => a.geometry === 'line' && Array.isArray(a.path) && a.path.length >= 2

// Smoothly fly the camera to the spotlighted asset.
function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo(target, 13.5, { duration: 2.4, easeLinearity: 0.2 })
  }, [map, target && target[0], target && target[1]])
  return null
}

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

function Stat({ label, value, format, suffix }) {
  const v = useCountUp(value, 900)
  return (
    <div className="live-stat">
      <div className="live-stat-v">{format ? format(v) : Math.round(v)}{suffix || ''}</div>
      <div className="live-stat-k">{label}</div>
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LiveView({ assets }) {
  const [now, setNow] = useState(() => new Date())
  const [spot, setSpot] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const located = useMemo(() => assets.filter(hasLocation), [assets])

  // Rotate the spotlight through every located asset.
  useEffect(() => {
    if (located.length < 2) return
    const id = setInterval(() => setSpot((s) => s + 1), SPOTLIGHT_MS)
    return () => clearInterval(id)
  }, [located.length])
  const spotAsset = located.length ? located[spot % located.length] : null

  const totals = useMemo(() => {
    const amount = assets.reduce((s, a) => s + (Number(a.amount) || 0), 0)
    return {
      count: assets.length,
      amount,
      blocks: new Set(assets.map((a) => a.block).filter(Boolean)).size,
      gps: new Set(assets.map((a) => a.gp).filter(Boolean)).size,
      sectors: new Set(assets.map((a) => a.sector).filter(Boolean)).size,
    }
  }, [assets])

  const byBlock = useMemo(() => aggregate(assets, (a) => a.block).slice(0, 8), [assets])
  const bySector = useMemo(() => aggregate(assets, (a) => a.sector), [assets])
  const leader = byBlock[0]?.amount || 1

  // Newest first (listAssets orders by created_at desc already).
  const tickerItems = useMemo(() => assets.slice(0, 14), [assets])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }

  if (!assets.length) {
    return (
      <div className="live">
        <div className="empty" style={{ margin: 'auto', color: '#94a3b8' }}>
          <div className="empty-icon">📡</div>
          <b style={{ color: '#e2e8f0' }}>Nothing on air yet</b>
          <div style={{ marginTop: 6 }}>Add assets to light up the live board.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="live">
      <div className="live-top">
        <div className="live-badge"><span className="live-pulse" />LIVE</div>
        <div className="live-title">Howrah District — Panchayat Asset Board</div>
        <div className="live-clock">{now.toLocaleTimeString('en-IN', { hour12: false })}</div>
        <button className="live-full" onClick={toggleFullscreen} title="Toggle fullscreen">⛶</button>
      </div>

      <div className="live-stats">
        <Stat label="Assets on record" value={totals.count} />
        <Stat label="Invested" value={totals.amount} format={compactINR} />
        <Stat label="Blocks" value={totals.blocks} suffix=" / 14" />
        <Stat label="Gram Panchayats" value={totals.gps} />
        <Stat label="Sectors" value={totals.sectors} />
      </div>

      <div className="live-mid">
        <div className="live-left">
          <div className="live-panel">
            <h3>🏆 Block leaderboard</h3>
            {byBlock.map((b, i) => (
              <div className="live-rank" key={b.key}>
                <span className="live-rank-pos">{MEDALS[i] || `#${i + 1}`}</span>
                <div className="live-rank-body">
                  <div className="live-rank-name">
                    <span>{b.key}</span>
                    <span className="live-rank-amt">{compactINR(b.amount)}</span>
                  </div>
                  <div className="live-rank-track">
                    <div className="live-rank-fill" style={{
                      width: `${(b.amount / leader) * 100}%`,
                      animationDelay: `${i * 70}ms`,
                    }} />
                  </div>
                </div>
                <span className="live-rank-count">{b.count}</span>
              </div>
            ))}
          </div>

          <div className="live-panel">
            <h3>🎯 Sectors in play</h3>
            <div className="live-chips">
              {bySector.map((s) => (
                <span className="live-chip" key={s.key} style={{ '--c': sectorColor(s.key) }}>
                  {sectorIcon(s.key)} {s.key} · <b>{compactINR(s.amount)}</b>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="live-map">
          <MapContainer center={DISTRICT.center} zoom={DISTRICT.zoom} style={{ height: '100%' }}
            zoomControl={false} attributionControl={true}>
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {spotAsset && spotAsset.lat != null && (
              <FlyTo target={[Number(spotAsset.lat), Number(spotAsset.lng)]} />
            )}
            {located.map((a) => (
              <Marker key={a.id} position={[Number(a.lat), Number(a.lng)]}
                icon={dotIcon(a.sector, spotAsset && a.id === spotAsset.id)}>
                <Tooltip direction="top" offset={[0, -10]}>
                  <div className="tip"><b>{a.name}</b><div>{sectorIcon(a.sector)} {a.sector} · {compactINR(a.amount)}</div></div>
                </Tooltip>
              </Marker>
            ))}
            {located.filter(isLine).map((a) => (
              <Polyline key={'l' + a.id} positions={a.path}
                pathOptions={{ color: sectorColor(a.sector), weight: 4, opacity: 0.9 }} />
            ))}
          </MapContainer>

          {spotAsset && (
            <div className="live-spot" key={spotAsset.id}>
              <div className="live-spot-head">
                <span className="live-spot-icon" style={{ background: sectorColor(spotAsset.sector) }}>
                  {sectorIcon(spotAsset.sector)}
                </span>
                <div>
                  <b>{spotAsset.name}</b>
                  <div className="live-spot-sub">
                    {[spotAsset.gp, spotAsset.block].filter(Boolean).join(', ')}
                    {spotAsset.department ? ` · ${spotAsset.department}` : ''}
                  </div>
                </div>
                <div className="live-spot-amt">{compactINR(spotAsset.amount)}</div>
              </div>
              <div className="live-spot-sub" style={{ marginTop: 4 }}>
                {fmtDate(spotAsset.startDate)} → {fmtDate(spotAsset.endDate)}
                {spotAsset.fundName ? ` · ${spotAsset.fundName}` : ''}
              </div>
              {located.length > 1 && <div className="live-spot-progress" />}
            </div>
          )}
        </div>
      </div>

      <div className="live-ticker">
        <div className="live-ticker-track">
          {[...tickerItems, ...tickerItems].map((a, i) => (
            <span className="live-ticker-item" key={i}>
              {sectorIcon(a.sector)} <b>{a.name}</b> — {[a.gp, a.block].filter(Boolean).join(', ')} · {compactINR(a.amount)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
