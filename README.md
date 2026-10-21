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

2. Copy env and fill VPS API / media keys:

```bash
cp .env.example .env.local
```

3. Apply SQL migrations against **VPS Postgres** (SSH tunnel / `DATABASE_URL`), in order under `migrations/`.  
   If this database was originally dumped from Supabase, also run:

`migrations/20261021120000_drop_supabase_leftovers.sql`

4. Create a staff user in `profiles` (password hash via your auth bootstrap), then promote to admin if needed:

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
- [x] Postgres schema + storage buckets (SQL migrations)  
- [x] Staff auth + Admin/Manager gate  
- [x] Admin shell, Integrations (Admin-only), Users list  
- [x] Catalog CMS: categories, products, variants, media, related, SEO  
- [x] Storefront reads live catalog from VPS Postgres  
- [ ] Checkout, Pathao, payments — Phase 2  

Storefront catalog is DB-backed. Seed SQL loads the starter styles; manage them under `/admin/catalog`.
