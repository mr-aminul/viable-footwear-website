-- Store Pathao courier status label for admin display
alter table public.orders
  add column if not exists pathao_status text;

-- Backfill from notes written by earlier syncPathaoOrderStatus
update public.orders
set pathao_status = nullif(trim(both from regexp_replace(notes, '^Pathao:\s*', '')), '')
where pathao_consignment_id is not null
  and notes ~ '^Pathao:\s*'
  and pathao_status is null;
