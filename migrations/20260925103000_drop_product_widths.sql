-- Remove unused product width options (normal/narrow) — not part of product scope.
alter table public.products
  drop column if exists widths;
