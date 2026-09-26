-- Global storefront settings (brand, footer, product promises) in site_pages.

alter table public.site_pages
  drop constraint if exists site_pages_key_check;

alter table public.site_pages
  add constraint site_pages_key_check check (
    page_key in ('home', 'about', 'site')
  );

insert into public.site_pages (page_key, content)
values ('site', '{}'::jsonb)
on conflict (page_key) do nothing;
