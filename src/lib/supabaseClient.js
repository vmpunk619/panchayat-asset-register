import { createClient } from '@supabase/supabase-js'

// Configured via Vite env vars (see .env.example). The app shows a friendly
// "configure Supabase" screen when these are missing instead of crashing.
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anon)

export const supabase = isConfigured
  ? createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
