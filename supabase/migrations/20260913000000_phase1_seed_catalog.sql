-- Phase 1 seed: starter categories + products from the previous static catalog.
-- Safe to re-run: uses fixed UUIDs and ON CONFLICT DO NOTHING.

insert into public.categories (id, name, slug, image_path, sort_order, active, seo_title, seo_description)
values
  ('11111111-1111-4111-8111-111111111101', 'Crocs', 'crocs', '/images/categories/cat-tile-crocs.png', 10, true, 'Crocs | Viable', 'Foam Crocs for everyday Dhaka wear.'),
  ('11111111-1111-4111-8111-111111111102', 'Foam Runners', 'foam-runners', '/images/categories/cat-tile-foam-runners.png', 20, true, 'Foam Runners | Viable', 'Ultra-light foam runners.'),
  ('11111111-1111-4111-8111-111111111103', 'Slides', 'slides', '/images/categories/cat-tile-slides.png', 30, true, 'Slides | Viable', 'Cloud-soft slides.'),
  ('11111111-1111-4111-8111-111111111104', 'Sneakers', 'sneakers', '/images/categories/cat-tile-sneakers.png', 40, true, 'Sneakers | Viable', 'Street-ready sneakers.'),
  ('11111111-1111-4111-8111-111111111105', 'Flip-flops', 'flip-flops', '/images/categories/cat-tile-flip-flops.png', 50, true, 'Flip-flops | Viable', 'Everyday flip-flops.'),
  ('11111111-1111-4111-8111-111111111106', 'Lifestyle', 'lifestyle', '/images/categories/cat-tile-lifestyle.png', 60, true, 'Lifestyle | Viable', 'Casual lifestyle footwear.')
on conflict (id) do nothing;

insert into public.products (
  id, category_id, name, slug, description, price, compare_at, weight_kg,
  rating, reviews_count, badge, featured, active, related_product_ids,
  seo_title, seo_description
)
values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'Ridge Foam Crocs',
    'ridge-foam-crocs',
    'Sculptural foam Crocs with organic ridge texture. Feather-light for all-day Dhaka walks, rain or shine.',
    2890, null, 0.45, 4.9, 128, 'Bestseller', true, true,
    array['22222222-2222-4222-8222-222222222204'::uuid, '22222222-2222-4222-8222-222222222203'::uuid],
    'Ridge Foam Crocs | Viable',
    'Sculptural foam Crocs — light, loud, built for Dhaka.'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111104',
    'Vista Chunky Sneaker',
    'vista-chunky-sneaker',
    'Street-ready chunky silhouette in earthy olive. Thick sole, soft upper — built for city streets.',
    4490, null, 0.75, 4.8, 86, 'New', true, true,
    array['22222222-2222-4222-8222-222222222205'::uuid, '22222222-2222-4222-8222-222222222208'::uuid],
    'Vista Chunky Sneaker | Viable',
    'Chunky olive sneaker for Dhaka streets.'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111103',
    'Noir Cloud Slide',
    'noir-cloud-slide',
    'Cloud-soft foam slides in charcoal. Slip on, step out — your everyday essential.',
    1990, null, 0.35, 4.7, 204, 'Bestseller', true, true,
    '{}',
    'Noir Cloud Slide | Viable',
    'Charcoal cloud-soft slides from Viable.'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111101',
    'Skyform Crocs',
    'skyform-crocs',
    'Pastel sky foam Crocs with breathable sculptural vents. Soft, playful, unmistakably Viable.',
    2690, 3190, 0.45, 4.6, 61, 'Sale', true, true,
    '{}',
    'Skyform Crocs | Viable',
    'Pastel sky foam Crocs on sale.'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '11111111-1111-4111-8111-111111111104',
    'Pulse Mustard Kick',
    'pulse-mustard-kick',
    'Bold mustard dad sneaker with a chunky white sole. Made to be seen on campus and café streets.',
    3990, null, 0.7, 4.8, 47, 'New', true, true,
    '{}',
    'Pulse Mustard Kick | Viable',
    'Bold mustard sneaker from Viable.'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '11111111-1111-4111-8111-111111111102',
    'Moss Foam Runner',
    'moss-foam-runner',
    'Sage green foam runner with organic aperture pattern. Ultra-light, ultra-now.',
    3290, null, 0.4, 4.9, 152, 'Bestseller', true, true,
    '{}',
    'Moss Foam Runner | Viable',
    'Sage foam runner for everyday motion.'
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    '11111111-1111-4111-8111-111111111106',
    'Harbor Canvas Low',
    'harbor-canvas-low',
    'Classic navy canvas low-top with rubber toe cap. Clean lines for everyday Viable energy.',
    2790, null, 0.55, 4.4, 38, null, true, true,
    '{}',
    'Harbor Canvas Low | Viable',
    'Navy canvas low-tops from Viable.'
  ),
  (
    '22222222-2222-4222-8222-222222222208',
    '11111111-1111-4111-8111-111111111104',
    'Midnight Runner',
    'midnight-runner',
    'Deep navy performance-casual runner. Soft knit upper, cushioned midsole for long Dhaka days.',
    4290, 4990, 0.65, 4.7, 74, 'Sale', false, true,
    '{}',
    'Midnight Runner | Viable',
    'Deep navy runner — casual performance.'
  ),
  (
    '22222222-2222-4222-8222-222222222209',
    '11111111-1111-4111-8111-111111111105',
    'Drift Cream Flip',
    'drift-cream-flip',
    'Cloud-soft cream foam flip-flops with nubby footbed grip. Lightweight everyday essential for Dhaka heat.',
    1790, null, 0.25, 4.6, 88, 'New', true, true,
    '{}',
    'Drift Cream Flip | Viable',
    'Cream foam flip-flops for Dhaka heat.'
  )
on conflict (id) do nothing;

-- Primary images (local public paths until staff re-uploads to Storage)
insert into public.product_media (id, product_id, media_type, storage_path, alt, sort_order)
values
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'image', '/images/products/product-foam-cream.png', 'Ridge Foam Crocs', 0),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'image', '/images/products/product-sneaker-olive.png', 'Vista Chunky Sneaker', 0),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203', 'image', '/images/products/product-slide-charcoal.png', 'Noir Cloud Slide', 0),
  ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222204', 'image', '/images/products/product-crocs-blue.png', 'Skyform Crocs', 0),
  ('33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222205', 'image', '/images/products/product-sneaker-mustard.png', 'Pulse Mustard Kick', 0),
  ('33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222206', 'image', '/images/products/product-foam-sage.png', 'Moss Foam Runner', 0),
  ('33333333-3333-4333-8333-333333333307', '22222222-2222-4222-8222-222222222207', 'image', '/images/products/product-canvas-navy.png', 'Harbor Canvas Low', 0),
  ('33333333-3333-4333-8333-333333333308', '22222222-2222-4222-8222-222222222208', 'image', '/images/products/product-sneaker-navy.png', 'Midnight Runner', 0),
  ('33333333-3333-4333-8333-333333333309', '22222222-2222-4222-8222-222222222209', 'image', '/images/products/product-flipflop-cream.png', 'Drift Cream Flip', 0)
on conflict (id) do nothing;

-- Size variants (stocked) for each seeded product
insert into public.product_variants (product_id, size_eu, color, color_hex, sku, stock, active)
select
  p.id,
  s.size_eu,
  c.color,
  c.color_hex,
  upper(left(replace(p.slug, '-', ''), 8)) || '-' || s.size_eu::text,
  12,
  true
from public.products p
cross join (values (38::numeric), (39), (40), (41), (42), (43), (44)) as s(size_eu)
cross join lateral (
  select
    case p.slug
      when 'ridge-foam-crocs' then 'Cream'
      when 'vista-chunky-sneaker' then 'Olive'
      when 'noir-cloud-slide' then 'Charcoal'
      when 'skyform-crocs' then 'Sky'
      when 'pulse-mustard-kick' then 'Mustard'
      when 'moss-foam-runner' then 'Sage'
      when 'harbor-canvas-low' then 'Navy'
      when 'midnight-runner' then 'Midnight'
      when 'drift-cream-flip' then 'Cream'
      else 'Default'
    end as color,
    case p.slug
      when 'ridge-foam-crocs' then '#E8E0D5'
      when 'vista-chunky-sneaker' then '#6B7A4E'
      when 'noir-cloud-slide' then '#2B2B2B'
      when 'skyform-crocs' then '#A8C5D4'
      when 'pulse-mustard-kick' then '#C9A227'
      when 'moss-foam-runner' then '#8A9A7B'
      when 'harbor-canvas-low' then '#1A3668'
      when 'midnight-runner' then '#1A3668'
      when 'drift-cream-flip' then '#E8E0D5'
      else '#1A3668'
    end as color_hex
) c
where p.id in (
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222202',
  '22222222-2222-4222-8222-222222222203',
  '22222222-2222-4222-8222-222222222204',
  '22222222-2222-4222-8222-222222222205',
  '22222222-2222-4222-8222-222222222206',
  '22222222-2222-4222-8222-222222222207',
  '22222222-2222-4222-8222-222222222208',
  '22222222-2222-4222-8222-222222222209'
)
on conflict (product_id, size_eu, color) do nothing;
