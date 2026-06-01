-- Panchayat Asset Register — schema, helpers and Row-Level Security.
-- Paste this whole file into the Supabase SQL editor and run it once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per login, linked to a Supabase Auth user. Holds role + jurisdiction.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  name       text not null default '',
  role       text not null check (role in ('admin','zp','samiti','gp')),
  block      text not null default '',
  gp         text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  sector          text,
  level           text,                 -- tier: GP / Panchayat Samiti / Zilla Parishad
  block           text,
  gp              text,
  village         text,
  department      text,                 -- sanctioning department
  fund_name       text,
  amount          numeric default 0,
  start_date      date,
  end_date        date,
  geometry        text not null default 'point',  -- 'point' | 'line'
  lat             double precision,
  lng             double precision,
  path            jsonb,                -- [[lat,lng], ...] for line assets
  address         text,
  notes           text,
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_by_name text,
  created_by_role text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index if not exists assets_block_gp_idx on public.assets (block, gp);
create index if not exists assets_level_idx    on public.assets (level);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they bypass RLS → no recursion)
-- ---------------------------------------------------------------------------

create or replace function public.my_role() returns text
  language sql stable security definer set search_path = public as
$$ select role  from public.profiles where id = auth.uid() $$;

create or replace function public.my_block() returns text
  language sql stable security definer set search_path = public as
$$ select block from public.profiles where id = auth.uid() $$;

create or replace function public.my_gp() returns text
  language sql stable security definer set search_path = public as
$$ select gp    from public.profiles where id = auth.uid() $$;

-- Can the current user see / modify an asset with these attributes?
-- Mirrors the app's role model: admin = all; zp = ZP-tier (district-wide);
-- samiti = block-tier within its block; gp = GP-tier within its block+GP.
create or replace function public.can_touch(a_level text, a_block text, a_gp text)
  returns boolean language sql stable security definer set search_path = public as
$$
  select
    public.my_role() = 'admin'
    or (public.my_role() = 'zp'     and a_level = 'Zilla Parishad (District)')
    or (public.my_role() = 'samiti' and a_level = 'Panchayat Samiti (Block)' and a_block = public.my_block())
    or (public.my_role() = 'gp'     and a_level = 'Gram Panchayat (GP)'      and a_block = public.my_block() and a_gp = public.my_gp())
$$;

-- Public boolean used by the first-run "create administrator" screen.
create or replace function public.admin_exists() returns boolean
  language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.profiles where role = 'admin') $$;
grant execute on function public.admin_exists() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.assets   enable row level security;

-- profiles: a user reads its own row; admin reads all. Writes happen only via
-- the admin-users Edge Function (service role), so no write policies here.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.my_role() = 'admin');

-- assets: visibility + writes both gated by can_touch().
drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets for select
  using (public.can_touch(level, block, gp));

drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets for insert
  with check (public.can_touch(level, block, gp));

drop policy if exists assets_update on public.assets;
create policy assets_update on public.assets for update
  using (public.can_touch(level, block, gp))
  with check (public.can_touch(level, block, gp));

drop policy if exists assets_delete on public.assets;
create policy assets_delete on public.assets for delete
  using (public.can_touch(level, block, gp));
