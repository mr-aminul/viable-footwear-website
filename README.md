# Viable Footwear

Next.js storefront + Admin/Manager ops for Viable (Dhaka casual footwear).

## Stack

- **App:** Next.js 15 (App Router) + TypeScript + Tailwind v4 + Framer Motion  
- **Host:** GitHub → Vercel → custom domain  
- **DB / Auth / Storage:** Supabase free tier  

Full requirements & task list: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env and fill Supabase keys:

```bash
cp .env.example .env.local
```

3. In Supabase → SQL Editor, run in order:

`supabase/migrations/20260910000000_phase0_foundation.sql`  
`supabase/migrations/20260913000000_phase1_seed_catalog.sql`

4. Create your first Auth user (Authentication → Users), then promote to admin:

```sql
update public.profiles
set role = 'admin', full_name = 'Owner'
where email = 'you@example.com';
```

5. Start the app:

```bash
npm run dev
```

- Storefront: http://localhost:3000  
- Staff login: http://localhost:3000/admin/login  

## Deploy (Vercel)

Production: **https://viable.inventivelab.bd** (also `www` + `viable-footwear.vercel.app`)

GitHub `main` auto-deploys. Env vars are set in the Vercel project.

In Supabase Auth → URL config, set:
- **Site URL:** `https://viable.inventivelab.bd`
- **Redirect URLs:** `https://viable.inventivelab.bd/auth/callback` (+ `http://localhost:3000/auth/callback` for local)

## Phase status

- [x] Next.js migration (storefront routes preserved)  
- [x] Supabase schema + RLS + storage buckets (SQL migration)  
- [x] Staff auth + Admin/Manager gate  
- [x] Admin shell, Integrations (Admin-only placeholder), Users list  
- [x] Catalog CMS: categories, products, variants, media, related, SEO  
- [x] Storefront reads live catalog from Supabase  
- [ ] Checkout, Pathao, payments — Phase 2  

After Phase 0 SQL, also run:

`supabase/migrations/20260913000000_phase1_seed_catalog.sql`

Storefront catalog is DB-backed. Seed SQL loads the starter styles; manage them under `/admin/catalog`.
