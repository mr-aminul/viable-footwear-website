# Viable Footwear

Next.js storefront + Admin/Manager ops for Viable (Dhaka casual footwear).

## Stack

- **App:** Next.js 15 (App Router) + TypeScript + Tailwind v4 + Framer Motion  
- **Host:** VPS (Caddy + systemd Next.js) with optional Cloudflare in front  
- **DB / API / Media:** VPS Postgres via PostgREST + MinIO (`s3.viable.fashion`)  

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

## Deploy (VPS)

Production: **https://viable.fashion** (also `www`, plus inventivelab aliases when DNS points at the VPS)

On the server (`/var/www/viable`):

```bash
sudo bash scripts/deploy-vps.sh
```

That pulls `main`, builds, and restarts `viable-web.service`. Caddy terminates HTTPS and reverse-proxies to `127.0.0.1:3000`. Production secrets live in `/var/www/viable/.env.local` (not in git).

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
