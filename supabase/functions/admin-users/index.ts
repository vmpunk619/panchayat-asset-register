// Edge Function: admin-controlled user management.
//
// The service_role key (auto-injected here, NEVER shipped to the browser) is
// the only way to create/delete auth users. The browser calls this function;
// it authorises the caller (must be an admin) and then performs the action.
//
// Deploy with JWT verification OFF so the first-run bootstrap (create the very
// first admin, when no profiles exist yet) can call it without a session:
//   supabase functions deploy admin-users --no-verify-jwt
//
// Actions (POST JSON body): { action: 'create' | 'delete' | 'reset-password', ... }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

// Usernames are turned into synthetic emails so we can use real Supabase Auth
// while keeping a username-based login UX. Must match auth.js on the client.
const EMAIL_DOMAIN = 'panchayat.local'
const ROLES = ['admin', 'zp', 'samiti', 'gp']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const body = await req.json().catch(() => ({}))
    const action = body.action

    // Identify the caller (if signed in) and their role.
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    let caller: { id: string } | null = null
    if (token && token !== ANON) {
      const { data } = await admin.auth.getUser(token)
      caller = data?.user ?? null
    }
    let callerRole: string | null = null
    if (caller) {
      const { data } = await admin.from('profiles').select('role').eq('id', caller.id).single()
      callerRole = data?.role ?? null
    }
    const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true })
    const noProfilesYet = (count ?? 0) === 0

    if (action === 'create') {
      const username = String(body.username || '').trim().toLowerCase()
      const { password, role } = body
      const name = (body.name || username) as string
      const block = (body.block || '') as string
      const gp = (body.gp || '') as string

      if (!username || !password || !role) return json({ error: 'username, password and role are required' }, 400)
      if (!/^[a-z0-9._-]+$/.test(username)) return json({ error: 'Username: lowercase letters, numbers, . _ - only' }, 400)
      if (String(password).length < 4) return json({ error: 'Password must be at least 4 characters' }, 400)
      if (!ROLES.includes(role)) return json({ error: 'Invalid role' }, 400)
      if ((role === 'samiti' || role === 'gp') && !block) return json({ error: 'Block required for this role' }, 400)
      if (role === 'gp' && !gp) return json({ error: 'GP required for this role' }, 400)

      // Authorise: an admin, OR the one-time bootstrap of the first admin.
      const allowed = callerRole === 'admin' || (noProfilesYet && role === 'admin')
      if (!allowed) return json({ error: 'Only an administrator can create users' }, 403)

      const email = `${username}@${EMAIL_DOMAIN}`
      const { data: created, error: cErr } =
        await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (cErr) return json({ error: cErr.message }, 400)

      const uid = created.user.id
      const { error: pErr } = await admin.from('profiles').insert({
        id: uid, username, name, role,
        block: role === 'samiti' || role === 'gp' ? block : '',
        gp: role === 'gp' ? gp : '',
      })
      if (pErr) {
        await admin.auth.admin.deleteUser(uid) // roll back the auth user
        return json({ error: pErr.message }, 400)
      }
      return json({ user: { id: uid, username, name, role, block, gp } })
    }

    if (action === 'delete') {
      if (callerRole !== 'admin') return json({ error: 'Only an administrator can delete users' }, 403)
      const id = String(body.id || '')
      if (!id) return json({ error: 'id required' }, 400)
      if (caller && id === caller.id) return json({ error: 'You cannot delete your own account' }, 400)
      const { data: target } = await admin.from('profiles').select('role').eq('id', id).single()
      if (target?.role === 'admin') {
        const { count: admins } = await admin.from('profiles')
          .select('*', { count: 'exact', head: true }).eq('role', 'admin')
        if ((admins ?? 0) <= 1) return json({ error: 'Cannot delete the only administrator' }, 400)
      }
      const { error } = await admin.auth.admin.deleteUser(id) // cascades to profile
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action === 'reset-password') {
      if (callerRole !== 'admin') return json({ error: 'Only an administrator can reset passwords' }, 403)
      const { id, password } = body
      if (!id || !password || String(password).length < 4) return json({ error: 'id and a 4+ char password required' }, 400)
      const { error } = await admin.auth.admin.updateUserById(id, { password })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
