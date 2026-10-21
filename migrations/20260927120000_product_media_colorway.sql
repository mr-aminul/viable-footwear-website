-- Colorway name on gallery images (matches product_variants.color).
-- null = shared / unassigned; sizes inherit images from their colorway.
alter table public.product_media
  add column if not exists color text;

comment on column public.product_media.color is
  'Colorway name this image belongs to (matches product_variants.color). Null = shared/unassigned.';

-- Backfill from existing variant media assignments (one color per image).
update public.product_media pm
set color = trim(sub.color)
from (
  select distinct on (v.media_id)
    v.media_id,
    v.color
  from public.product_variants v
  where v.media_id is not null
    and v.color is not null
    and trim(v.color) <> ''
  order by v.media_id, v.size_eu
) sub
where pm.id = sub.media_id
  and pm.color is null;
