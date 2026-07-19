// Asset storage — Supabase (Postgres) backend.
//
// All persistence is isolated here. Row-Level Security on the server enforces
// who can read/write which rows; these functions just map between the app's
// camelCase asset shape and the DB's snake_case columns.

import { supabase } from './supabaseClient.js'

function rowToAsset(r) {
  return {
    id: r.id,
    name: r.name,
    sector: r.sector,
    level: r.level,
    block: r.block,
    gp: r.gp,
    village: r.village,
    department: r.department,
    fundName: r.fund_name,
    amount: Number(r.amount) || 0,
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    geometry: r.geometry || 'point',
    lat: r.lat,
    lng: r.lng,
    path: r.path || null,
    address: r.address || '',
    notes: r.notes || '',
    photos: Array.isArray(r.photos) ? r.photos : [],
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdByRole: r.created_by_role,
    createdAt: r.created_at,
  }
}

function num(v) {
  return v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v)
}

function assetToRow(a) {
  return {
    name: a.name,
    sector: a.sector || null,
    level: a.level || null,
    block: a.block || null,
    gp: a.gp || null,
    village: a.village || null,
    department: a.department || null,
    fund_name: a.fundName || null,
    amount: Number(a.amount) || 0,
    start_date: a.startDate || null,
    end_date: a.endDate || null,
    geometry: a.geometry || 'point',
    lat: num(a.lat),
    lng: num(a.lng),
    path: a.path && a.path.length ? a.path : null,
    address: a.address || null,
    notes: a.notes || null,
    photos: Array.isArray(a.photos) && a.photos.length ? a.photos : null,
    created_by_name: a.createdByName || null,
    created_by_role: a.createdByRole || null,
  }
}

export async function listAssets() {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(rowToAsset)
}

// The photos column only exists after migration 0002 has been run; if it is
// missing, drop the field and retry so plain saves keep working.
const missingPhotosColumn = (e) => /'photos' column|photos.*schema cache/i.test(e?.message || '')

// Insert (no id) or update (existing id). Returns the saved asset.
export async function saveAsset(asset) {
  const write = async (row) => {
    if (asset.id) {
      return supabase.from('assets')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', asset.id).select().single()
    }
    return supabase.from('assets').insert(row).select().single()
  }
  const row = assetToRow(asset)
  let { data, error } = await write(row)
  if (error && missingPhotosColumn(error)) {
    const { photos, ...rest } = row
    ;({ data, error } = await write(rest))
  }
  if (error) throw error
  return rowToAsset(data)
}

export async function deleteAsset(id) {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}

// Deletes every asset the caller is allowed to delete (RLS-scoped).
export async function clearAll() {
  const { error } = await supabase
    .from('assets')
    .delete()
    .not('id', 'is', null)
  if (error) throw error
}
