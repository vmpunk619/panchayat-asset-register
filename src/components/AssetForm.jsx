import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import {
  BLOCK_NAMES, SECTOR_NAMES, FUNDS, DEPARTMENTS, LEVELS, sectorColor, sectorIcon, blockCenter,
} from '../data/howrah.js'
import { pathLengthKm, midpoint, formatKm } from '../lib/format.js'
import { uploadAssetPhoto } from '../lib/photos.js'

// Leaflet is heavy — load the picker only when the form opens.
const LocationPicker = lazy(() => import('./LocationPicker.jsx'))

const MAX_PHOTOS = 3

const BLANK = {
  name: '', sector: '', level: LEVELS[0], block: '', gp: '', village: '',
  department: '', fundName: '', amount: '', startDate: '', endDate: '',
  geometry: 'point', lat: null, lng: null, path: null, address: '', notes: '',
  photos: [],
}

export default function AssetForm({ initial, scope = {}, gpSuggestions = [], onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => {
    if (initial) return { ...BLANK, ...initial }
    // New asset: pre-fill (and lock) jurisdiction from the signed-in user's scope.
    const seed = { ...BLANK }
    if (scope.level) seed.level = scope.level
    if (scope.block) {
      seed.block = scope.block
      const c = blockCenter(scope.block)
      seed.lat = c[0]; seed.lng = c[1]
    }
    if (scope.gp) seed.gp = scope.gp
    return seed
  })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [photoErr, setPhotoErr] = useState('')
  const photoInputRef = useRef(null)
  const isEdit = Boolean(initial && initial.id)

  const photos = Array.isArray(form.photos) ? form.photos : []

  async function handlePhotoPick(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (!files.length) return
    setPhotoErr('')
    setUploading(true)
    try {
      const urls = []
      for (const f of files) urls.push(await uploadAssetPhoto(f))
      setForm((f) => ({ ...f, photos: [...(f.photos || []), ...urls].slice(0, MAX_PHOTOS) }))
    } catch (err) {
      setPhotoErr(err.message)
    } finally {
      setUploading(false)
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const isLine = form.geometry === 'line'
  const path = form.path || []
  const lengthKm = isLine ? pathLengthKm(path) : 0

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Asset name is required'
    if (!form.sector) e.sector = 'Select a sector'
    if (!form.block) e.block = 'Select a block'
    if (form.amount === '' || Number.isNaN(Number(form.amount))) e.amount = 'Enter an amount'
    if (isLine) {
      if (path.length < 2) e.location = 'Trace the route: click at least 2 points along it on the map'
    } else if (form.lat == null || form.lng == null) {
      e.location = 'Set a location (click the map, drag the pin, or use block centre)'
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = 'End date is before start date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit() {
    if (!validate()) return
    // For a line, anchor the marker/popup at the route's midpoint.
    let lat = form.lat, lng = form.lng
    if (isLine) {
      const mid = midpoint(path)
      if (mid) { lat = mid[0]; lng = mid[1] }
    }
    onSave({
      ...form,
      name: form.name.trim(),
      gp: form.gp.trim(),
      village: form.village.trim(),
      amount: Number(form.amount) || 0,
      path: isLine ? path : null,
      lat: lat == null ? null : Number(lat),
      lng: lng == null ? null : Number(lng),
    })
  }

  // Switch geometry type, keeping any work already done.
  function setGeometry(g) {
    setForm((f) => {
      if (g === 'line') {
        const seed = f.lat != null && f.lng != null ? [[f.lat, f.lng]] : []
        return { ...f, geometry: 'line', path: f.path && f.path.length ? f.path : seed }
      }
      const last = f.path && f.path.length ? f.path[f.path.length - 1] : null
      return { ...f, geometry: 'point', lat: last ? last[0] : f.lat, lng: last ? last[1] : f.lng }
    })
  }

  const gpList = useMemo(() => [...new Set(gpSuggestions.filter(Boolean))].sort(), [gpSuggestions])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <header>
          <h2>{isEdit ? 'Edit asset' : 'Add asset'}</h2>
          <div style={{ flex: 1 }} />
          {form.sector && (
            <span className="chip" style={{ background: sectorColor(form.sector) }}>{form.sector}</span>
          )}
        </header>

        <div className="content">
          <div className="form-grid">
            <div className="field full">
              <label>Asset name <span className="req">*</span></label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Sub-Centre Building, Salap" />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div className="field">
              <label>Sector <span className="req">*</span></label>
              <select value={form.sector} onChange={(e) => set('sector', e.target.value)}>
                <option value="">— select —</option>
                {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.sector && <div className="error-text">{errors.sector}</div>}
            </div>

            <div className="field">
              <label>Created by (tier) <span className="req">*</span></label>
              <select value={form.level} disabled={scope.lockLevel} onChange={(e) => set('level', e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {scope.lockLevel && <div className="hint">Fixed to your login tier</div>}
            </div>

            <div className="field">
              <label>Block / Panchayat Samiti <span className="req">*</span></label>
              <select value={form.block} disabled={scope.lockBlock} onChange={(e) => {
                set('block', e.target.value)
                // offer block centre as a default location if none set yet
                if (e.target.value && form.lat == null) {
                  const c = blockCenter(e.target.value)
                  setForm((f) => ({ ...f, block: e.target.value, lat: c[0], lng: c[1] }))
                }
              }}>
                <option value="">— select —</option>
                {BLOCK_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {scope.lockBlock && <div className="hint">Fixed to your jurisdiction</div>}
              {errors.block && <div className="error-text">{errors.block}</div>}
            </div>

            <div className="field">
              <label>Gram Panchayat (GP)</label>
              <input list="gp-suggestions" value={form.gp} disabled={scope.lockGP}
                onChange={(e) => set('gp', e.target.value)} placeholder="Type GP name" />
              <datalist id="gp-suggestions">
                {gpList.map((g) => <option key={g} value={g} />)}
              </datalist>
              {scope.lockGP && <div className="hint">Fixed to your jurisdiction</div>}
            </div>

            <div className="field">
              <label>Village</label>
              <input value={form.village} onChange={(e) => set('village', e.target.value)}
                placeholder="Village / mouza" />
            </div>

            <div className="field">
              <label>Sanctioning department</label>
              <select value={form.department} onChange={(e) => set('department', e.target.value)}>
                <option value="">— select —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Fund / Scheme</label>
              <select value={form.fundName} onChange={(e) => set('fundName', e.target.value)}>
                <option value="">— select —</option>
                {FUNDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Amount (₹) <span className="req">*</span></label>
              <input type="number" min="0" step="1000" value={form.amount}
                onChange={(e) => set('amount', e.target.value)} placeholder="e.g. 1850000" />
              {errors.amount && <div className="error-text">{errors.amount}</div>}
            </div>

            <div className="field">
              <label>Construction start</label>
              <input type="date" value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
            </div>

            <div className="field">
              <label>Construction end</label>
              <input type="date" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
              {errors.endDate && <div className="error-text">{errors.endDate}</div>}
            </div>

            <div className="field full">
              <label>Address</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)}
                placeholder="Locality / landmark" />
            </div>

            <div className="field full">
              <label>Map geometry — how this asset is shown on the map</label>
              <div className="geo-toggle">
                <button type="button" className={'geo-btn' + (!isLine ? ' active' : '')}
                  onClick={() => setGeometry('point')}>📍 Point — single location</button>
                <button type="button" className={'geo-btn' + (isLine ? ' active' : '')}
                  onClick={() => setGeometry('line')}>🛣️ Line / route — road, drain, canal</button>
              </div>
            </div>

            {!isLine && (
              <>
                <div className="field">
                  <label>Latitude</label>
                  <input type="number" step="0.000001" value={form.lat ?? ''}
                    onChange={(e) => set('lat', e.target.value === '' ? null : Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Longitude</label>
                  <input type="number" step="0.000001" value={form.lng ?? ''}
                    onChange={(e) => set('lng', e.target.value === '' ? null : Number(e.target.value))} />
                </div>
              </>
            )}

            <div className="field full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <label style={{ margin: 0 }}>
                  {isLine ? 'Route — click along the road in order to trace it' : 'Location — click the map or drag the pin'}
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {isLine && (
                    <>
                      <span className="muted">{path.length} pts · <b>{formatKm(lengthKm)}</b></span>
                      <button type="button" className="link" disabled={!path.length}
                        onClick={() => setForm((f) => ({ ...f, path: (f.path || []).slice(0, -1) }))}>Undo point</button>
                      <button type="button" className="link" disabled={!path.length}
                        onClick={() => setForm((f) => ({ ...f, path: [] }))}>Clear</button>
                    </>
                  )}
                  {!isLine && form.block && (
                    <button type="button" className="link" onClick={() => {
                      const c = blockCenter(form.block)
                      setForm((f) => ({ ...f, lat: c[0], lng: c[1] }))
                    }}>Use {form.block} centre</button>
                  )}
                </div>
              </div>
              <Suspense fallback={<div className="pick-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>}>
                <LocationPicker
                  mode={form.geometry}
                  lat={form.lat} lng={form.lng}
                  path={path}
                  onPoint={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
                  onPath={(p) => setForm((f) => ({ ...f, path: p }))}
                />
              </Suspense>
              {isLine && <div className="hint">Tip: click each bend of the road in order — the length updates automatically. The {sectorIcon(form.sector || 'Other')} icon will sit at the route's midpoint.</div>}
              {errors.location && <div className="error-text">{errors.location}</div>}
            </div>

            <div className="field full">
              <label>Photos <span className="muted" style={{ textTransform: 'none' }}>(up to {MAX_PHOTOS})</span></label>
              <div className="photo-grid">
                {photos.map((url) => (
                  <div className="photo-thumb" key={url}>
                    <img src={url} alt="Asset photo" />
                    <button type="button" className="photo-x" title="Remove photo"
                      onClick={() => setForm((f) => ({ ...f, photos: (f.photos || []).filter((u) => u !== url) }))}>
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button type="button" className="photo-add" disabled={uploading}
                    onClick={() => photoInputRef.current?.click()}>
                    {uploading ? <span className="spinner" /> : <span style={{ fontSize: 20 }}>＋</span>}
                    {uploading ? 'Uploading…' : 'Add photo'}
                  </button>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple
                style={{ display: 'none' }} onChange={handlePhotoPick} />
              {photoErr && <div className="error-text">{photoErr}</div>}
              <div className="hint">JPG/PNG up to 5 MB each. Photos appear in the asset's map popup.</div>
            </div>

            <div className="field full">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional details / remarks" />
            </div>
          </div>
        </div>

        <footer>
          {isEdit && (
            <button className="btn danger" style={{ marginRight: 'auto' }}
              onClick={() => onDelete(form.id)}>Delete</button>
          )}
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={submit}>{isEdit ? 'Save changes' : 'Add asset'}</button>
        </footer>
      </div>
    </div>
  )
}
