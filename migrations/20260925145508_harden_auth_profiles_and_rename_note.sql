-- Staff accounts are created only via Admin (service client).
-- Ensure password_hash exists for app-managed bcrypt auth.

alter table public.profiles
  add column if not exists password_hash text;

comment on column public.profiles.password_hash is
  'bcrypt hash for staff login; set only via Admin / service client.';
