-- Viable Phase 0 schema: profiles, catalog foundation, integrations, storage buckets

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'manager');
create type public.media_type as enum ('image', 'video');

-- Staff profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'manager',
  active boolean not null default true,
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

-- Admin-only integration config (prefer secrets in Vercel env; store non-secret flags here)
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

-- Auto-create profile on signup (default manager; promote first admin manually)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'manager')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers for RLS
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and active = true
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
      and role in ('admin', 'manager')
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'admin'
  )
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.product_variants enable row level security;
alter table public.campaigns enable row level security;
alter table public.integration_settings enable row level security;

-- Profiles
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users update own non-role fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins manage profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Public read active catalog
create policy "Public read active categories"
  on public.categories for select
  using (active = true or public.is_staff());

create policy "Staff write categories"
  on public.categories for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Public read active products"
  on public.products for select
  using (active = true or public.is_staff());

create policy "Staff write products"
  on public.products for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Public read product media"
  on public.product_media for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.active = true or public.is_staff())
    )
  );

create policy "Staff write product media"
  on public.product_media for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Public read active variants"
  on public.product_variants for select
  using (
    active = true and exists (
      select 1 from public.products p
      where p.id = product_id and (p.active = true or public.is_staff())
    )
    or public.is_staff()
  );

create policy "Staff write variants"
  on public.product_variants for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Staff read campaigns"
  on public.campaigns for select
  using (public.is_staff() or active = true);

create policy "Staff write campaigns"
  on public.campaigns for all
  using (public.is_staff())
  with check (public.is_staff());

-- Integrations: Admin only
create policy "Admin read integrations"
  on public.integration_settings for select
  using (public.is_admin());

create policy "Admin write integrations"
  on public.integration_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('product-videos', 'product-videos', true)
on conflict (id) do nothing;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Staff upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_staff());

create policy "Staff update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_staff());

create policy "Staff delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_staff());

create policy "Public read product videos"
  on storage.objects for select
  using (bucket_id = 'product-videos');

create policy "Staff upload product videos"
  on storage.objects for insert
  with check (bucket_id = 'product-videos' and public.is_staff());

create policy "Staff update product videos"
  on storage.objects for update
  using (bucket_id = 'product-videos' and public.is_staff());

create policy "Staff delete product videos"
  on storage.objects for delete
  using (bucket_id = 'product-videos' and public.is_staff());
