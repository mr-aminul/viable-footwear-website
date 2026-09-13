# Viable Footwear — Requirements & Task Breakdown

**Status:** Phase 5 complete — motion system + storefront polish; cross-cutting / launch checklist remain  
**Last updated:** 2026-09-14  
**Current codebase:** Next.js App Router storefront (DB catalog) + Admin CMS + COD/bKash/Nagad checkout/Pathao + sales/logistics analytics + GTM/Pixel/OMS webhooks + motion polish + production on Vercel (`viable.inventivelab.bd`).

**Secrets approach (4.4):** Payment/Pathao/OMS credentials live in `integration_settings` (Admin UI) with optional Vercel env fallback. Views expose only non-secret flags (`hasApiKey`, etc.). Marketing IDs are Admin-configured and injected server-side on the storefront only.

---

## 1. Product goal

Ship a Bangladesh-ready ecommerce site for Viable Footwear where customers can browse, pay (bKash / Nagad / COD), and get Pathao-priced delivery; and where Admin/Manager run catalog, orders, logistics, campaigns, and integrations from a web dashboard.

---

## 2. Locked stack (free-tier)

| Layer | Choice |
|--------|--------|
| Repo | GitHub |
| Host | Vercel (Hobby) ← deploy from GitHub |
| Domain | Existing purchased domain → Vercel DNS |
| App | Next.js (App Router) + TypeScript + Tailwind (reuse current design tokens) |
| DB | Supabase Postgres (free) |
| Auth | Supabase Auth + role claims / `profiles` |
| Media | Supabase Storage (free) — product images + video |
| Motion | Framer Motion (extend existing) |
| Charts | Recharts (or similar OSS) |
| Marketing tags | GTM + GA4 + Meta Pixel (free; Admin-configured) |
| Payments | bKash PGW + Nagad merchant APIs (transaction fees only) |
| Shipping | Pathao Merchant API |

**Secrets:** Vercel env vars + Admin-only Integration settings. Never expose service role, payment, or Pathao keys to the client.

---

## 3. Roles

| Capability | Manager | Admin |
|------------|---------|-------|
| Products, categories, prices, media, descriptions | Yes | Yes |
| Related products (“You May Also Like”) | Yes | Yes |
| Orders: view, update status, pack/ship notes | Yes | Yes |
| Campaign delivery rules | Yes | Yes |
| Sales & logistics dashboards | View | View + export |
| Payment gateway credentials / webhooks | No | Yes |
| Pathao credentials / store defaults | No | Yes |
| GTM / Pixel / Nuport-like config | No | Yes |
| Invite/disable Manager users | No | Yes |
| Site-wide shipping defaults & COD fee policy | Limited | Full |

All mutating APIs enforce role server-side (RLS + service checks). UI hiding is not security.

---

## 4. Functional requirements (must-have)

### 4.1 Catalog & media
- CRUD products and categories.
- Fields: name, slug, description (rich text or markdown), price, compare-at, category, sizes/colors/stock, active flag.
- Multi-image gallery + optional product video (upload to Supabase Storage).
- SEO fields per product/category/page: title, meta description, OG image.

### 4.2 Related products
- Per-product ordered list of related product IDs (manual).
- Storefront “You May Also Like” uses that list; fallback to same-category only if list empty.
- Editable by Admin and Manager.

### 4.3 Checkout & payments
- Checkout: contact + address (Pathao city/zone/area) → delivery quote → pay.
- Methods: **bKash**, **Nagad**, **COD**.
- Amounts computed server-side; client never trusted for payable total.
- Persist payment attempts; verify via gateway callback/query before marking paid.

### 4.4 Shipping (Pathao)
- Live quote via Pathao price API using store, weight, city, zone, delivery type.
- If COD: add COD fee from API/`cod_percentage` (or Admin-configured fallback).
- Apply active campaign delivery rule (if any).
- Final customer charge = `Math.ceil(total)` (ROUNDUP).
- Create Pathao consignment when order is ready to ship; store tracking/consignment ID.
- Webhook or poll for status updates into logistics dashboard.

### 4.5 Campaign delivery rules
- Conditional delivery charge overrides, e.g. free shipping over ৳X, % off delivery, fixed delivery, geo/date windows, payment-method filters.
- Priority/order when multiple campaigns match (document: highest priority wins, or first match).
- Admin + Manager can create/edit/disable.

### 4.6 Admin / Manager app
- Auth-gated `/admin` (or `/dashboard`).
- Catalog, orders, campaigns, media, dashboards.
- Admin-only: Integrations (bKash, Nagad, Pathao, GTM, Pixel, Nuport-like webhook).

### 4.7 Analytics dashboards
- **Sales:** orders, GMV, AOV, payment mix, top products, status funnel, date range.
- **Logistics:** to-ship, in-transit, delivered, failed/returned, COD outstanding, Pathao status breakdown.

### 4.8 SEO
- Unique metadata per route/product (Next.js Metadata API).
- Product JSON-LD; sitemap.xml; robots.txt.
- Semantic URLs (`/product/[slug]`).

### 4.9 Motion / UX
- Page transitions and meaningful component motion (cart, PDP gallery, list→detail).
- Respect `prefers-reduced-motion`.
- Preserve current brand direction (navy/spark tokens); no redesign for its own sake.

### 4.10 Integrations (scope)
- **GTM:** Admin sets container ID; dataLayer events for view_item, add_to_cart, begin_checkout, purchase.
- **Meta Pixel:** Admin sets Pixel ID (prefer fire via GTM).
- **Nuport-like:** Admin sets base URL + API key; emit order lifecycle webhooks (created, paid, shipped, delivered). Adapter stub acceptable until credentials exist.

### 4.11 Storefront (carry forward / harden)
- Home, shop (filter/sort), PDP, cart → real checkout.
- Persisted cart (cookie/local + optional signed-in later).
- Remove or demote “Secure Pay” claims until gateways are live.
- WhatsApp remains optional support CTA, not primary checkout.

---

## 5. Non-functional

- Free-tier only for infra (Vercel + Supabase + OSS).
- Mobile-first storefront; usable admin on desktop.
- Server-side validation on all money, stock, and role boundaries.
- Audit-friendly: who changed product price / integration settings (Admin actions logged if cheap to add).
- Compress/limit video length to stay within Supabase Storage free quota.

---

## 6. Out of scope (v1)

- Multi-warehouse / multi-courier beyond Pathao  
- Customer accounts / wishlist sync (optional later)  
- Card acquiring beyond bKash/Nagad unless already in gateway  
- Native mobile apps  
- Full ERP / accounting export (CSV export on dashboards is enough)

---

## 7. Domain model (minimum)

```
profiles          id, role (admin|manager), name, email
categories        id, name, slug, seo_*, sort, active
products          id, category_id, name, slug, description, price, compare_at,
                  weight_kg, active, seo_*, related_product_ids[]
product_media     id, product_id, type (image|video), path, sort, alt
product_variants  id, product_id, size, color, sku, stock, price_override?
campaigns         id, name, rules_json, priority, starts_at, ends_at, active
orders            id, status, customer_*, address_*, payment_method, totals_*, campaign_id?
order_items       id, order_id, product_id, variant_id, qty, unit_price
payment_attempts  id, order_id, gateway, external_id, status, raw_json
shipments         id, order_id, pathao_consignment_id, status, quote_json, tracking
integration_settings  key, value_encrypted_or_ref, updated_by, updated_at
```

**Shipping quote formula:**  
`ceil( pathao_final_price + cod_fee_if_any + campaign_adjustment )`

---

## 8. Phased task list

Legend: `[ ]` todo · Owner hints: Eng / Design / Ops / Content

---

### Phase 0 — Platform foundation

**Goal:** Next.js + Supabase + Auth + deploy path + empty Admin shell.

#### 0.1 Project migration
- [x] Scaffold Next.js App Router (TS) in repo (replace or wrap Vite app).
- [x] Port Tailwind theme tokens from `src/index.css`.
- [x] Port public routes: Home, Shop, Product, Cart, About (static data OK temporarily).
- [x] Port Framer Motion usage without breaking reduced-motion.
- [x] Configure `vercel.json` / Next defaults; remove SPA-only rewrite if obsolete.
- [x] Connect GitHub repo → Vercel project; preview deploys on PR.
- [x] Attach custom domain on Vercel; HTTPS verify.

#### 0.2 Supabase project
- [x] Create Supabase project (free).
- [x] Add env to local `.env` / `.env.local` (Vercel still pending): URL, anon, service role, DATABASE_URL.
- [x] SQL migrations for core tables (profiles, categories, products, media, variants).
- [x] Enable RLS; policies for public read of active catalog; write = authenticated staff.
- [x] Create Storage buckets: `product-images`, `product-videos` (public read for published assets; write = staff).
- [x] Seed Admin user; document how to promote Manager.

#### 0.3 Auth & roles
- [x] Supabase Auth email/password (or magic link) for staff only.
- [x] `profiles.role` = `admin` | `manager`; sync on signup/invite.
- [x] Middleware protect `/admin/**`.
- [x] Helper `requireRole('admin' | 'manager')` for server actions/API.
- [x] Admin: list staff profiles (invite/disable UI later; promote via SQL for now).

#### 0.4 Admin shell
- [x] `/admin` layout: nav (Catalog, Orders, Campaigns, Analytics, Integrations*).
- [x] Integrations nav visible to Admin only.
- [x] Empty dashboard home with placeholders for Sales / Logistics KPIs.

**Phase 0 done when:** Domain serves Next app from Vercel; Admin can log in; Manager cannot open Integrations; catalog still readable on storefront.

---

### Phase 1 — Catalog CMS + SEO + related products

**Goal:** Staff-managed catalog is source of truth; SEO per product; manual YMAL.

#### 1.1 Categories CRUD
- [x] List / create / edit / soft-delete (or deactivate) categories.
- [x] Slug uniqueness; SEO title/description fields.
- [x] Storefront shop filters read from DB.

#### 1.2 Products CRUD
- [x] List with search, filter by category/active, sort.
- [x] Create/edit: name, slug, description, price, compare-at, category, weight_kg, active.
- [x] Variants: size, color, stock, optional SKU.
- [x] Validation: price ≥ 0; slug unique; at least one active variant to sell (define rule).
- [x] Soft-deactivate instead of hard delete if orders reference product.

#### 1.3 Media
- [x] Upload multiple images → Supabase Storage; reorder; set primary; alt text.
- [x] Upload one optional video; size/type limits documented.
- [x] PDP gallery uses ordered media; video player if present.
- [x] Delete removes DB row + storage object.

#### 1.4 Related products (“You May Also Like”)
- [x] Admin/Manager UI: search + add/remove/reorder related products (exclude self).
- [x] Persist ordered IDs on product.
- [x] PDP section renders manual list; fallback same-category if empty.
- [x] Cap display count (e.g. 4–8) configurable constant.

#### 1.5 Storefront wired to DB
- [x] Home featured / categories from DB.
- [x] Shop filter/sort against DB (keep UX parity with current shop).
- [x] PDP loads by slug; 404 if inactive/missing.
- [x] Cart line items include variant_id; stock check on add/checkout.

#### 1.6 SEO
- [x] Metadata API per product/category/static page.
- [x] Open Graph + Twitter cards.
- [x] Product JSON-LD (name, image, price, availability).
- [x] `sitemap.ts` + `robots.ts`.
- [ ] Content pass: default meta templates + brand description (Content).

**Phase 1 done when:** Manager can fully manage catalog/media/related; storefront shows only DB products; product URLs have unique meta + sitemap entry.

---

### Phase 2 — Checkout, Pathao, payments, campaigns

**Goal:** Real orders with correct delivery math and payable flows.

#### 2.1 Cart → order draft
- [x] Persist cart (localStorage + server draft optional).
- [x] Checkout page: name, phone (BD 01XXXXXXXXX), address line, Pathao city/zone/area selects.
- [x] Create `orders` + `order_items` in `pending_payment` or `pending_cod`.
- [x] Stock reservation strategy (decrement on pay confirm / on COD place—document and implement one).

#### 2.2 Pathao integration
- [x] Admin stores Pathao credentials + `store_id` (Integrations).
- [x] Server: auth token cache; city/zone/area list endpoints for checkout UI.
- [x] Server: price-plan quote (weight from sum of product weights or default).
- [x] COD fee from API percentage × amount_to_collect (fallback Admin %).
- [x] ROUNDUP final delivery charge; show breakdown: delivery, COD fee, campaign, total.
- [x] Create consignment API when status → `shipped`/`ready_to_ship` (define trigger).
- [x] Persist consignment id + webhook/poll handler for status.

#### 2.3 Campaign delivery rules
- [x] Campaign model: name, priority, date range, active, rule type.
- [x] Rule types (v1): free_shipping_min_subtotal; delivery_percent_off; delivery_fixed; optional city allow/deny list.
- [x] Evaluate after Pathao base+COD; before ceil (or after—**decide: apply then ceil**).
- [x] Manager/Admin CRUD UI; preview quote in admin optional.
- [x] Store `campaign_id` + snapshot amounts on order.

#### 2.4 bKash
- [x] Admin: sandbox/prod credentials + callback URLs.
- [x] Create payment (server) → redirect customer → execute/query on callback.
- [x] Idempotent order mark `paid`; store trx id on `payment_attempts`.
- [x] Failure/cancel paths return customer to checkout with message.
- [ ] Ops: complete merchant onboarding (Ops); sandbox test matrix (Eng).

#### 2.5 Nagad
- [x] Admin credentials + RSA keys as required.
- [x] Initiate → complete/verify flow; same order state machine as bKash.
- [ ] Sandbox test matrix (Eng + Ops).

#### 2.6 COD
- [x] Place order without gateway; status `awaiting_fulfillment`.
- [x] `amount_to_collect` = goods + delivery (post-campaign, ceiled) passed to Pathao.
- [x] Clear UX: COD fee shown before confirm.

#### 2.7 Order confirmation UX
- [x] Success / failure pages with order id.
- [ ] Optional email via free Resend later; v1 can be on-page + Admin notification only.
- [x] Stop advertising unpaid gateways until live credentials verified.
- [x] Guest “Your Orders” (browser localStorage + Pathao tracking refresh via order+phone lookup).

**Phase 2 done when:** Customer can complete bKash, Nagad, and COD orders; delivery charge matches Pathao+COD+campaign+ceil; Admin sees order + can create shipment.

---

### Phase 3 — Ops dashboards & order management

**Goal:** Run the business day-to-day.

#### 3.1 Order management
- [x] Orders list: filters (status, payment method, date, city).
- [x] Detail: items, address, payment, shipping quote snapshot, Pathao tracking.
- [x] Status transitions with allowed graph (e.g. pending → paid → packed → shipped → delivered; cancel/return).
- [x] Manager + Admin can update; log actor if easy.

#### 3.2 Sales dashboard
- [x] KPI cards: orders count, GMV, AOV, paid vs COD.
- [x] Charts: sales over time, payment method mix, top products.
- [x] Date range preset (7/30/90).
- [x] Admin CSV export of orders for range.

#### 3.3 Logistics dashboard
- [x] Counts by Pathao/shipment status.
- [x] COD outstanding / collected (as data allows).
- [x] List “needs shipping” queue.
- [x] Link out to Pathao tracking where available.

**Phase 3 done when:** Staff can fulfill from dashboard and answer “how are sales / deliveries doing?” without SQL.

---

### Phase 4 — Marketing & external integrations

**Goal:** Tag managers + outbound order webhooks; Admin-configurable.

#### 4.1 Google Tag Manager
- [x] Admin field: GTM container ID; enable toggle.
- [x] Inject GTM on storefront when enabled (Next script strategy).
- [x] dataLayer pushes: view_item, add_to_cart, begin_checkout, purchase (with value, currency BDT, items).

#### 4.2 Meta Pixel
- [x] Admin Pixel ID + enable (document: prefer GTM-managed Pixel).
- [x] If direct: base pixel + standard events aligned with dataLayer.

#### 4.3 Nuport-like / warehouse OMS webhook
- [x] Admin: endpoint URL, API key/header, enable, event checklist.
- [x] POST JSON on order created / paid / shipped / delivered (retry with backoff, log failures).
- [x] Stub mode: log-only when URL empty.
- [ ] Wire real partner when credentials available (Ops).

#### 4.4 Integration settings security
- [x] Admin-only routes/UI.
- [x] Secrets stored encrypted or in Vercel env with Admin “configured” flags—pick one approach and document.
- [x] Never return raw secrets to Manager or client bundles.

**Phase 4 done when:** Admin can turn on GTM/Pixel without deploy; purchase events fire; outbound webhook delivers test payload.

---

### Phase 5 — Motion & storefront polish

**Goal:** Feel premium without blocking commerce.

#### 5.1 Motion system
- [x] Shared page transition wrapper for storefront routes.
- [x] ProductCard → PDP shared-element or consistent enter animation.
- [x] Cart drawer / checkout step transitions.
- [x] Header/mobile nav (already partially done)—align to system.
- [x] Global `prefers-reduced-motion` short-circuit.

#### 5.2 UX polish
- [x] Loading/skeleton states for shop/PDP.
- [x] Empty cart / empty admin tables.
- [x] Error toasts for quote/payment failures (plain language).
- [x] Trust copy only for enabled payment methods.

**Phase 5 done when:** Key journeys feel intentional on mobile + desktop; motion disabled when OS requests.

---

## 9. Cross-cutting tasks (all phases)

- [ ] `.env.example` documented for every secret.
- [ ] README: local setup (Node, Supabase CLI optional, Vercel link).
- [ ] Error monitoring light-touch (Vercel logs enough for v1).
- [ ] Rate-limit payment create + Pathao quote endpoints (basic).
- [ ] BD phone + address validation helpers.
- [ ] Currency formatting ৳ throughout.
- [ ] Accessibility: focus states, alt text, form labels on checkout/admin.

---

## 10. Acceptance checklist (launch)

- [ ] Domain on Vercel serves production Next app.
- [ ] Admin and Manager login; permissions match §3.
- [ ] Catalog CRUD + media + related products work end-to-end.
- [ ] SEO: unique product title/description; sitemap returns product URLs.
- [ ] Checkout quote: Pathao + COD fee + campaign + ROUNDUP matches manual calc on sample addresses.
- [ ] bKash sandbox payment marks order paid once.
- [ ] Nagad sandbox payment marks order paid once.
- [ ] COD order creates with correct collect amount.
- [x] Sales + logistics dashboards show real order data.
- [ ] GTM container loads; purchase event visible in GTM preview.
- [ ] Pixel configured or explicitly deferred via GTM.
- [ ] Nuport-like webhook receives test order event.
- [ ] No payment/Pathao secrets in client JS bundles.

---

## 11. Ops prerequisites (parallel, non-code)

| Item | Owner | Needed by |
|------|--------|-----------|
| Supabase project + Vercel team access | Eng | Phase 0 |
| Domain DNS access | Ops | Phase 0 |
| Pathao merchant + API access | Ops | Phase 2 |
| bKash merchant + sandbox/prod apps | Ops | Phase 2 |
| Nagad merchant + keys | Ops | Phase 2 |
| GTM + GA4 accounts | Marketing | Phase 4 |
| Meta Business / Pixel | Marketing | Phase 4 |
| Nuport (or equivalent) credentials | Ops | Phase 4 (optional) |

---

## 12. Requirement → phase map

| Must-have | Phase |
|-----------|-------|
| Stack: GitHub → Vercel → domain + Supabase DB/Storage | 0 |
| Admin vs Manager accounts | 0–1 |
| Product/category/price/image/video/description CRUD | 1 |
| Customizable You May Also Like | 1 |
| SEO metadata | 1 |
| Pathao delivery + COD fee + ROUNDUP | 2 |
| Conditional campaign delivery | 2 |
| bKash + Nagad | 2 |
| Analytics Sales + Logistics | 3 |
| GTM / Pixel / Nuport-like scope | 4 |
| Interactive animations | 5 |

---

## 13. Open decisions (resolve during build)

1. Stock decrement: **decided for COD v1 — decrement on order place** (gateway payments can switch to on-paid later).  
2. Campaign applied before or after COD fee: **decided — Pathao delivery → campaign adjust → COD inflate → ceil**.  
3. Shipment create: **decided — manual “Send to Pathao” on order detail** (same as Chilirig).  
4. Secret storage: **Pathao — Admin Integrations UI → `integration_settings` (env fallback still works)**.  
5. Customer accounts: none in v1 (guest checkout only) unless pulled forward.
