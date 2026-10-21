-- Viable Phase 0 schema: profiles, catalog foundation, integrations, storage buckets

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'manager');
create type public.media_type as enum ('image', 'video');

-- Staff profiles (app-managed auth; bcrypt password_hash)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role public.user_role not null default 'manager',
  active boolean not null default true,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_path text,
  sort_order int not null default 0,
  active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  compare_at numeric(12, 2) check (compare_at is null or compare_at >= 0),
  weight_kg numeric(8, 3) not null default 0.5 check (weight_kg > 0),
  rating numeric(3, 2) not null default 0,
  reviews_count int not null default 0,
  badge text,
  featured boolean not null default false,
  active boolean not null default true,
  related_product_ids uuid[] not null default '{}',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  media_type public.media_type not null,
  storage_path text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size_eu numeric(4, 1) not null,
  color text,
  color_hex text,
  sku text,
  stock int not null default 0 check (stock >= 0),
  price_override numeric(12, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, size_eu, color)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority int not null default 0,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin-only integration config (prefer secrets in env; store non-secret flags here)
create table public.integration_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_active_featured_idx on public.products (active, featured);
create index product_media_product_id_idx on public.product_media (product_id);
create index product_variants_product_id_idx on public.product_variants (product_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();
create trigger integration_settings_updated_at before update on public.integration_settings
  for each row execute function public.set_updated_at();

-- Access control is enforced in the Next.js app + PostgREST service key.
-- Media lives on VPS MinIO (not Postgres storage).
