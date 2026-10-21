-- Archive superseded Pathao consignments when an order is reopened for resend.

alter table public.orders
  add column if not exists pathao_history jsonb not null default '[]'::jsonb;

comment on column public.orders.pathao_history is
  'Append-only list of previous Pathao consignments after Resend (consignment_id, status, error, cancelled_at, archived_at).';
