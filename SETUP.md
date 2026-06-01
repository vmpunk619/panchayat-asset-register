# Setup — Supabase + Vercel

This connects the app to a real backend (Supabase: Postgres + Auth + Row-Level
Security) and deploys it to Vercel. Do the steps in order. Anything secret
(service_role key) stays on Supabase — only the **anon** key goes in the app.

---

## A. Supabase

### 1. Create the project
1. Go to https://supabase.com → **New project**. Pick a name, a strong DB
   password, and a region near West Bengal (e.g. Singapore / Mumbai).
2. Wait for it to finish provisioning.

### 2. Create the schema + security
1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and click **Run**.
   This creates the `profiles` and `assets` tables, helper functions, and all
   Row-Level Security policies.

### 3. Deploy the user-management Edge Function
This is what lets the admin create logins (it uses the service_role key, which
must stay server-side). Install the Supabase CLI once: https://supabase.com/docs/guides/cli

```bash
# from the project folder
supabase login
supabase link --project-ref YOUR-PROJECT-REF      # ref is in your project URL / settings
supabase functions deploy admin-users --no-verify-jwt
```

`--no-verify-jwt` is required so the **first admin** can be created before anyone
is logged in. The function still authorises every call internally (only an admin,
or the one-time first-admin bootstrap, may create users).

> No CLI? You can instead create the function in the dashboard
> (**Edge Functions → Deploy a new function**, name it `admin-users`, paste
> [`supabase/functions/admin-users/index.ts`](supabase/functions/admin-users/index.ts)),
> then turn **Verify JWT = off** in that function's settings.

### 4. Get your keys
**Project Settings → API**, copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

(Do **not** copy the `service_role` key anywhere into this app.)

---

## B. Run locally

1. Copy `.env.example` to `.env` and paste your URL + anon key.
2. `npm install` then `npm run dev`.
3. Open the app → it shows **Create administrator account** (first-run bootstrap).
   Enter a name, username (e.g. `admin`) and password. This calls the Edge
   Function, creates the auth user + admin profile, and signs you in.
4. Go to the **Users** tab to create GP / Panchayat Samiti / Zilla Parishad logins.

> Login is by **username** (mapped internally to `username@panchayat.local`).
> Users don't need real email addresses.

---

## C. GitHub + Vercel

### 1. Push to GitHub
A git repo and first commit are already created for you. Create an empty repo on
GitHub (no README), then:

```bash
git remote add origin https://github.com/YOUR-USER/panchayat-asset-register.git
git branch -M main
git push -u origin main
```

### 2. Import into Vercel
1. https://vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework preset is detected as **Vite** (build `vite build`, output `dist`).
3. **Environment Variables** — add the same two:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy.** Every future `git push` to `main` auto-deploys.

### 3. Allow the deployed URL in Supabase (auth redirects)
Supabase → **Authentication → URL Configuration** → add your Vercel domain
(e.g. `https://your-app.vercel.app`) to the **Site URL / Redirect URLs**.

---

## Notes
- **Security model:** RLS enforces visibility/writes in the database itself —
  admin = all; ZP = ZP-tier (district-wide); Samiti = block-tier in its block;
  GP = GP-tier in its block+GP. Even with the public anon key, users can only
  touch their own rows.
- **Costs:** Supabase + Vercel free tiers are plenty for this.
- The old browser-only version's data is **not** migrated automatically. If you
  had entered assets locally, export them (Backup/CSV) from that build first,
  then Import here after logging in.
