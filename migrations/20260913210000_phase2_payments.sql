-- Phase 2.4: payment attempts + pending_payment status for gateways

alter type public.order_status add value if not exists 'pending_payment';
alter type public.order_status add value if not exists 'paid';

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  gateway text not null check (gateway in ('bkash', 'nagad')),
  external_id text,
  trx_id text,
  status text not null default 'created'
    check (status in ('created', 'completed', 'failed', 'cancelled')),
  amount numeric(12, 2) not null check (amount >= 0),
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_attempts_order_id_idx on public.payment_attempts (order_id);
create index payment_attempts_external_id_idx on public.payment_attempts (external_id);

create trigger payment_attempts_updated_at before update on public.payment_attempts
  for each row execute function public.set_updated_at();

alter table public.orders
  add column if not exists paid_at timestamptz,
  add column if not exists payment_trx_id text;

-- Payment attempts are accessed via the Next.js app + PostgREST service key.
