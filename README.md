# Panchayat Asset Register — Howrah District

A web app to record and map assets created by the three tiers of the Panchayati
Raj system — **Gram Panchayat (GP)**, **Panchayat Samiti (Block)** and
**Zilla Parishad (District)** — so you can see at a glance *what* was built,
*where*, in *which sector*, under *which fund*, and *when*.

## Backend

Data and logins live in **Supabase** (Postgres + Auth + Row-Level Security);
the app deploys to **Vercel**. First-time wiring (create the project, run the
SQL, deploy the Edge Function, set env vars, deploy) is in **[SETUP.md](SETUP.md)**.

## Run

```bash
npm install
cp .env.example .env   # then fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run build          # production build into dist/
```

Without the two env vars the app shows a "Connect Supabase" screen — see SETUP.md.

## What it does

- **Accounts & roles** (see below) — Admin, Zilla Parishad, Panchayat Samiti, Gram
  Panchayat. Each tier signs in and sees/enters only its jurisdiction; Admin sees all
  and creates the user accounts.
- **Add assets** with: name, sector, creating tier, block, GP, village, **sanctioning
  department**, fund/scheme, amount (₹), construction start/end dates, address, and a
  location.
- **Point or line geometry** — point assets drop a sector-icon pin; **roads, drains and
  canals are traced as a route** (click along the road) and drawn as a coloured polyline
  with auto-computed length in km.
- **Map view** — sector-specific **icons** (🏥 🏫 ♻️ 🛣️ …) per asset, **hover** for a quick
  summary tooltip, click for full details + edit. Auto-fits to whatever the filters show.
- **Dashboard** — totals (assets, ₹ investment, blocks/GPs/sectors covered) and
  breakdowns by sector, block, **department**, fund and year.
- **Table view** — full list, click *Edit* on any row.
- **Filters** (left panel) — tier, block, GP, sector, **department**, fund,
  construction-year range, and free-text search. Map, dashboard and table all respect them.
- **Import / Export** — Export CSV (current view), full JSON Backup, Import from CSV/JSON
  (Backup/Import/Erase are Admin-only).

## Accounts & roles

On first launch you create the **administrator** account. The Admin then creates all
other users (Users tab):

| Role | Sees / enters | Manages users |
|------|---------------|---------------|
| Administrator | Everything in the district | ✅ |
| Zilla Parishad (District) | Everything in the district | — |
| Panchayat Samiti (Block) | Only their **block** | — |
| Gram Panchayat (GP) | Only their **block › GP** | — |

For Samiti/GP users the block (and GP) is locked on both the form and the filters, so
they can only record and view work in their own jurisdiction.

Security is **enforced server-side** by Supabase Row-Level Security — admin = all;
ZP = ZP-tier (district-wide); Samiti = block-tier in its block; GP = GP-tier in its
block+GP. Even with the public anon key, a user can only read/write their own rows.
Login is by **username** (mapped internally to `username@panchayat.local`), so users
don't need real email addresses. Admin creates accounts via the `admin-users` Edge
Function. Auth glue is isolated in [`src/lib/auth.js`](src/lib/auth.js).

## Data model

Each asset record:

| field | notes |
|-------|-------|
| `name` | required |
| `sector` | required (see `src/data/howrah.js`) |
| `level` | GP / Panchayat Samiti / Zilla Parishad |
| `block` | one of Howrah's 14 blocks (fixed list) |
| `gp`, `village` | free text (GP autocompletes from what you've entered) |
| `department` | sanctioning department (Health, Education, PWD, P&RD, …) |
| `fundName` | scheme it was funded under |
| `amount` | rupees (number) |
| `startDate`, `endDate` | construction period |
| `geometry` | `point` or `line` |
| `lat`, `lng` | point location (for a line, the route midpoint) |
| `path` | `[[lat,lng], …]` route vertices (line assets only) |
| `address` | locality / landmark |
| `notes` | optional |
| `createdBy` | username that entered it (stamped automatically) |

## Where data lives

Everything is stored in your **Supabase** project (Postgres), shared across all
devices and users. Persistence is isolated in
[`src/lib/storage.js`](src/lib/storage.js) (async `listAssets` / `saveAsset` /
`deleteAsset` / `clearAll`) which maps the app's camelCase assets to the DB's
snake_case columns. The schema, policies and the user-management Edge Function are
in [`supabase/`](supabase/). See **[SETUP.md](SETUP.md)** to wire it up.

## Howrah reference data

The 14 blocks (Panchayat Samitis) are a fixed, accurate list. Block-HQ
coordinates are **approximate**, used only to centre the map / pre-fill a marker —
set the real location per asset. GP and village names are entered free-form
(autocomplete builds up as you add data), so no unverified GP list is baked in.
