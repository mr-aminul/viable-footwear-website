-- Optional colorway tag on gallery images.
-- null = shared across all colors; hex matches product_variants.color_hex.
alter table public.product_media
  add column if not exists color_hex text;

comment on column public.product_media.color_hex is
  'When set, image belongs to this colorway (matches variants.color_hex). Null = shared.';
