-- Phase 2: orders + order_items for COD checkout and Pathao dispatch

create type public.order_status as enum (
  'new',
  'awaiting_fulfillment',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'returned'
);

create type public.payment_method as enum ('cod', 'bkash', 'nagad');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status public.order_status not null default 'awaiting_fulfillment',
  payment_method public.payment_method not null default 'cod',
  email text,
  full_name text not null,
  phone text not null,
  secondary_phone text,
  address text not null,
  city_id int not null,
  zone_id int not null,
  area_id int,
  city_name text not null,
  zone_name text not null,
  area_name text not null default '',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  shipping numeric(12, 2) not null check (shipping >= 0),
  total numeric(12, 2) not null check (total >= 0),
  pathao_delivery_fee numeric(12, 2),
  pathao_consignment_id text,
  pathao_error text,
  pathao_cancelled_at timestamptz,
  campaign_id uuid references public.campaigns (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  size_eu numeric(4, 1),
  color text,
  sku text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  weight_kg numeric(8, 3) not null default 0.5 check (weight_kg > 0),
  created_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_payment_method_idx on public.orders (payment_method);
create index order_items_order_id_idx on public.order_items (order_id);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Staff manage orders; storefront creates via service role (bypasses RLS)
create policy "Staff read orders"
  on public.orders for select
  using (public.is_staff());

create policy "Staff write orders"
  on public.orders for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Staff read order items"
  on public.order_items for select
  using (public.is_staff());

create policy "Staff write order items"
  on public.order_items for all
  using (public.is_staff())
  with check (public.is_staff());
