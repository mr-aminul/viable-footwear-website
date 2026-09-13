-- Link each variant to an optional gallery image from the product media pool.
alter table public.product_variants
  add column if not exists media_id uuid references public.product_media (id) on delete set null;

create index if not exists product_variants_media_id_idx
  on public.product_variants (media_id);

comment on column public.product_variants.media_id is
  'Optional gallery image for this variant (picked from product_media).';
