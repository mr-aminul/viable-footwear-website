-- Promo codes: cart discounts scoped to selected products, with optional end date.

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null,
  description text not null default '',
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  discount_type text not null
    check (discount_type in ('percent', 'flat')),
  discount_value numeric(12, 2) not null
    check (discount_value > 0),
  product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_codes_code_unique unique (code)
);

create index promo_codes_active_idx on public.promo_codes (active);
create index promo_codes_schedule_idx on public.promo_codes (starts_at, ends_at);

create trigger promo_codes_updated_at before update on public.promo_codes
  for each row execute function public.set_updated_at();

alter table public.promo_codes enable row level security;

create policy "Staff read promo codes"
  on public.promo_codes for select
  using (public.is_staff());

create policy "Staff write promo codes"
  on public.promo_codes for all
  using (public.is_staff())
  with check (public.is_staff());

-- Snapshot promo usage on orders (service role writes at checkout)
alter table public.orders
  add column if not exists promo_code_id uuid references public.promo_codes (id) on delete set null,
  add column if not exists promo_code text,
  add column if not exists discount_amount numeric(12, 2) not null default 0
    check (discount_amount >= 0);

create index if not exists orders_promo_code_id_idx on public.orders (promo_code_id);
