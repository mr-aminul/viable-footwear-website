-- Products that don't use footwear sizes (bags, accessories) can opt out.
-- When false, variants still use size_eu = 0 as a one-size sentinel (NOT NULL + unique preserved).
alter table public.products
  add column if not exists requires_size boolean not null default true;

comment on column public.products.requires_size is
  'When true (default), customers must pick an EU size. When false, product is one-size (e.g. bags).';
