-- Anonymous storefront visitor keys, one row per visitor per Dhaka calendar day.

create table public.site_daily_visitors (
  visit_date date not null,
  visitor_key text not null,
  hit_count integer not null default 1 check (hit_count > 0),
  last_seen_at timestamptz not null default now(),
  primary key (visit_date, visitor_key)
);

create index site_daily_visitors_visit_date_idx
  on public.site_daily_visitors (visit_date desc);

comment on table public.site_daily_visitors is
  'Storefront unique visitors by day (Asia/Dhaka). Written via PostgREST service key only.';

create or replace function public.record_site_visit(p_visitor_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (timezone('Asia/Dhaka', now()))::date;
begin
  if p_visitor_key is null
     or char_length(p_visitor_key) < 8
     or char_length(p_visitor_key) > 80
     or p_visitor_key !~ '^[A-Za-z0-9_-]+$' then
    return;
  end if;

  insert into public.site_daily_visitors (visit_date, visitor_key)
  values (d, p_visitor_key)
  on conflict (visit_date, visitor_key) do update
    set hit_count = public.site_daily_visitors.hit_count + 1,
        last_seen_at = now();
end;
$$;

revoke all on function public.record_site_visit(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.record_site_visit(text) to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'viable_app') then
    grant execute on function public.record_site_visit(text) to viable_app;
  end if;
end $$;
