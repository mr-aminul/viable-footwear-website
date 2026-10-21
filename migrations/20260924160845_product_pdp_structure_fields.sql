-- PDP structure fields (Birkenstock-style buy box content)
alter table public.products
  add column if not exists subtitle text,
  add column if not exists fit_note text,
  add column if not exists materials text not null default '',
  add column if not exists care_info text not null default '';

comment on column public.products.subtitle is 'Material/style line under the title (e.g. suede)';
comment on column public.products.fit_note is 'Sizing tip shown above size (e.g. runs small)';
comment on column public.products.materials is 'Materials accordion body';
comment on column public.products.care_info is 'Care / safety accordion body';
