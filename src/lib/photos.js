import { supabase } from './supabaseClient.js'

const BUCKET = 'asset-photos'
const MAX_MB = 5

// Upload one image to the public bucket; returns its public URL.
// Requires the 0002_photos.sql migration (bucket + policies) to have been run.
export async function uploadAssetPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.')
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Photo is too large (max ${MAX_MB} MB).`)
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600' })
  if (error) {
    if (/bucket.*not.*found/i.test(error.message)) {
      throw new Error('Photo storage is not set up yet — run supabase/migrations/0002_photos.sql in the Supabase SQL Editor.')
    }
    throw error
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
