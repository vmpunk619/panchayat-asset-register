// Auth + user management — Supabase Auth backend.
//
// Real authentication (Supabase Auth) with a username-based UX: each username
// maps to a synthetic email (username@panchayat.local). Role + jurisdiction
// live in the `profiles` table and are enforced server-side by RLS. Admin user
// creation goes through the `admin-users` Edge Function (service role). All of
// this is isolated here so the rest of the app is unaware of the backend.

import { supabase } from './supabaseClient.js'
import { LEVELS } from '../data/howrah.js'

// Must match EMAIL_DOMAIN in supabase/functions/admin-users/index.ts
const EMAIL_DOMAIN = 'panchayat.local'
const toEmail = (username) => `${String(username).trim().toLowerCase()}@${EMAIL_DOMAIN}`

export const ROLES = [
  { key: 'admin', label: 'Administrator', scope: 'all', desc: 'Sees everything, manages user accounts' },
  { key: 'zp', label: 'Zilla Parishad (District)', scope: 'all', desc: 'District tier, across all blocks' },
  { key: 'samiti', label: 'Panchayat Samiti (Block)', scope: 'block', desc: 'Block tier, one block' },
  { key: 'gp', label: 'Gram Panchayat (GP)', scope: 'gp', desc: 'GP tier, one GP within a block' },
]

export function roleLabel(key) {
  return ROLES.find((r) => r.key === key)?.label || key
}

const ROLE_LEVEL = { gp: LEVELS[0], samiti: LEVELS[1], zp: LEVELS[2] }
export function lockedLevel(user) {
  return user ? (ROLE_LEVEL[user.role] || null) : null
}
export function canManageUsers(user) {
  return user?.role === 'admin'
}
export function isDistrictWide(user) {
  return user?.role === 'admin' || user?.role === 'zp'
}

// Client-side scoping kept as defence-in-depth; RLS is the real enforcement.
export function scopeAssets(user, assets) {
  if (!user) return []
  if (user.role === 'admin') return assets
  const lvl = lockedLevel(user)
  return assets.filter((a) => {
    if (lvl && a.level !== lvl) return false
    if (user.role === 'samiti') return a.block === user.block
    if (user.role === 'gp') return a.block === user.block && a.gp === user.gp
    return true
  })
}

// ---- Session / profile ----

let _profile = null
export function currentUser() {
  return _profile
}

function toProfile(p) {
  return p
    ? { id: p.id, username: p.username, name: p.name, role: p.role, block: p.block || '', gp: p.gp || '' }
    : null
}

async function fetchProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  _profile = toProfile(data)
  return _profile
}

// Resolve the current session into a profile (called once on app start).
export async function loadSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) { _profile = null; return null }
  return fetchProfile(session.user.id)
}

// Subscribe to sign-in / sign-out. Profile fetch is deferred out of the
// callback to avoid Supabase's onAuthStateChange re-entrancy caveat.
export function onAuthChange(cb) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      if (session?.user) await fetchProfile(session.user.id)
      else _profile = null
      cb(_profile)
    }, 0)
  })
  return () => subscription.unsubscribe()
}

export async function login(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password })
  if (error) throw new Error('Invalid username or password')
  const profile = await fetchProfile(data.user.id)
  if (!profile) {
    await supabase.auth.signOut()
    throw new Error('This account has no profile yet. Contact the administrator.')
  }
  return profile
}

export async function logout() {
  await supabase.auth.signOut()
  _profile = null
}

// First-run check for the "create administrator" screen (callable by anon).
export async function hasAdmin() {
  const { data, error } = await supabase.rpc('admin_exists')
  if (error) throw error
  return Boolean(data)
}

// ---- Admin user management (via Edge Function) ----

async function callAdmin(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let msg = error.message
    try { const j = await error.context.json(); if (j?.error) msg = j.error } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export async function createUser({ username, password, role, name, block, gp }) {
  const out = await callAdmin({ action: 'create', username, password, role, name, block, gp })
  return out.user
}
export async function deleteUser(id) {
  await callAdmin({ action: 'delete', id })
}
export async function resetPassword(id, password) {
  await callAdmin({ action: 'reset-password', id, password })
}

export async function listUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('username')
  if (error) return []
  return (data || []).map(toProfile)
}
