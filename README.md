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

## Production

Public sites: **https://viable.fashion** (+ `www`) and media/API **https://s3.viable.fashion**.

| | |
|--|--|
| App | `/var/www/viable`, systemd `viable-web.service`, port **3000** |
| API | Docker PostgREST on **3001**, DB `viable` / role `viable_app` (native PG17) |
| Media | MinIO buckets `product-images`, `product-videos`, `site-media` |
| Edge | Caddy for the web app + `s3.viable.fashion` (`/viable-rest`) |

Secrets, SSH host, and provider tokens stay in **gitignored** `.env` / `.env.local` (and server `/var/www/viable/.env.local`). Never commit them. Local ops notes (IPs, etc.) go in `docs/ops.local.md` (also gitignored).

On the production server:

```bash
sudo bash scripts/deploy-vps.sh
```

Pulls `main`, builds, restarts `viable-web.service`, applies Caddy (`scripts/caddy/viable-web.caddy` so `/api/media` → MinIO), memory drop-in, health watchdog, nightly restart (03:15), weekly `.next/cache` wipe. On the server, prefer **localhost** for `MEDIA_*` / `VIABLE_API_URL`; browsers still use `/api/media/...` on the public domain (Caddy serves those from MinIO, not Node).

Product photos are resized once on upload (not on every customer view). Old photos without size variants still load; re-upload in admin if you want smaller thumbs.

## Phase status

- [x] Next.js migration (storefront routes preserved)  
- [x] Postgres schema + storage buckets (SQL migrations)  
- [x] Staff auth + Admin/Manager gate  
- [x] Admin shell, Integrations (Admin-only), Users list  
- [x] Catalog CMS: categories, products, variants, media, related, SEO  
- [x] Storefront reads live catalog from VPS Postgres  
- [ ] Checkout, Pathao, payments — Phase 2  

Storefront catalog is DB-backed. Seed SQL loads the starter styles; manage them under `/admin/catalog`.
