-- Photos per asset: a jsonb array of public URLs on each asset row, with the
-- files themselves in a public Storage bucket. Run this once in the Supabase
-- SQL Editor (same as 0001_init.sql).

alter table public.assets
  add column if not exists photos jsonb;

-- Public bucket for asset photos (read by anyone via URL; RLS on the assets
-- table still governs who can see the asset records themselves).
insert into storage.buckets (id, name, public)
values ('asset-photos', 'asset-photos', true)
on conflict (id) do nothing;

-- Any signed-in user may add photos; anyone may view them (public bucket).
drop policy if exists "asset photos read" on storage.objects;
create policy "asset photos read" on storage.objects
  for select using (bucket_id = 'asset-photos');

drop policy if exists "asset photos upload" on storage.objects;
create policy "asset photos upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'asset-photos');

drop policy if exists "asset photos delete" on storage.objects;
create policy "asset photos delete" on storage.objects
  for delete to authenticated using (bucket_id = 'asset-photos');
