-- Multi-channel orders: website + Messenger / WhatsApp / phone / etc.
-- Imported and manual orders share the same orders table; channel tells the source.

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'order_channel'
  ) then
    create type public.order_channel as enum (
      'website',
      'messenger',
      'whatsapp',
      'phone',
      'instagram',
      'walk_in',
      'other'
    );
  end if;
end $$;

alter table public.orders
  add column if not exists channel public.order_channel not null default 'website';

comment on column public.orders.channel is
  'Where the order was received: website checkout or offline channels (Messenger, WhatsApp, phone, etc.).';

create index if not exists orders_channel_idx on public.orders (channel);
