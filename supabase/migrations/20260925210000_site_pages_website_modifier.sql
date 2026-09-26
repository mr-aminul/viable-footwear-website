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

alter table public.site_pages enable row level security;

-- Anyone can read published page content (storefront)
create policy "Public read site pages"
  on public.site_pages for select
  using (true);

create policy "Staff write site pages"
  on public.site_pages for all
  using (public.is_staff())
  with check (public.is_staff());

-- Seed empty rows; app fills defaults when content is {}
insert into public.site_pages (page_key, content)
values
  ('home', '{}'::jsonb),
  ('about', '{}'::jsonb)
on conflict (page_key) do nothing;

-- Public site media (heroes, banners, videos)
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

create policy "Public read site media"
  on storage.objects for select
  using (bucket_id = 'site-media');

create policy "Staff upload site media"
  on storage.objects for insert
  with check (bucket_id = 'site-media' and public.is_staff());

create policy "Staff update site media"
  on storage.objects for update
  using (bucket_id = 'site-media' and public.is_staff());

create policy "Staff delete site media"
  on storage.objects for delete
  using (bucket_id = 'site-media' and public.is_staff());
