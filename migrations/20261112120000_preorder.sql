-- Pre-order: sold-out variants can be booked when the product allows it.
-- Default ON; admin turns OFF per product when they do not want bookings.

alter table public.products
  add column if not exists preorder_enabled boolean not null default true;

comment on column public.products.preorder_enabled is
  'When true (default), sold-out sizes may be pre-ordered for a fixed advance. Admin can turn off per product.';

alter table public.orders
  add column if not exists is_preorder boolean not null default false,
  add column if not exists amount_paid numeric(12, 2) not null default 0
    check (amount_paid >= 0),
  add column if not exists amount_due numeric(12, 2) not null default 0
    check (amount_due >= 0);

comment on column public.orders.is_preorder is
  'True when the order was placed as a pre-order (advance paid now, balance due later).';
comment on column public.orders.amount_paid is
  'Amount collected at checkout (pre-order advance or full prepaid total).';
comment on column public.orders.amount_due is
  'Balance still owed (product remainder + delivery for pre-orders; 0 when fully paid).';

alter table public.order_items
  add column if not exists is_preorder boolean not null default false;

comment on column public.order_items.is_preorder is
  'True when this line was sold out and booked via pre-order (no stock decrement).';
