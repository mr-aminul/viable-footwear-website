-- Website Modifier: editable storefront page content + site media bucket

create table public.site_pages (
  page_key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_pages_key_check check (
    page_key in ('home', 'about')
  )
);

create trigger site_pages_updated_at before update on public.site_pages
  for each row execute function public.set_updated_at();

-- Seed empty rows; app fills defaults when content is {}
insert into public.site_pages (page_key, content)
values
  ('home', '{}'::jsonb),
  ('about', '{}'::jsonb)
on conflict (page_key) do nothing;

-- Site media (heroes, banners, videos) is stored on VPS MinIO (`site-media` bucket).
