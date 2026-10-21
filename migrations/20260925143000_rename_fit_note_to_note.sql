-- Rename products.fit_note → note (idempotent)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'fit_note'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'note'
  ) then
    alter table public.products rename column fit_note to note;
  end if;
end $$;

comment on column public.products.note is 'Tip shown above size (e.g. sizing note)';
