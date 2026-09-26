-- Harden staff auth: ignore client-controlled signup metadata roles,
-- default new profiles to inactive, and freeze role/active on self-update.
-- Staff accounts must be activated (and role set) via Admin / service role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    -- Never trust user_metadata for authorization. Staff role is set later
    -- by createStaffUser / admin (service role).
    'manager'::public.user_role,
    false
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates an inactive manager profile; role/active are set only by admin paths.';

-- Prevent privilege escalation even if an UPDATE policy is too loose.
create or replace function public.profiles_freeze_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role may change anything (Admin staff actions).
  if coalesce(auth.jwt()->>'role', '') = 'service_role' then
    return new;
  end if;

  -- Admins may change role/active on any profile (including others).
  if public.is_admin() then
    return new;
  end if;

  -- Everyone else: freeze role and active to previous values.
  new.role := old.role;
  new.active := old.active;
  return new;
end;
$$;

drop trigger if exists profiles_freeze_privileged_fields on public.profiles;
create trigger profiles_freeze_privileged_fields
  before update on public.profiles
  for each row
  execute function public.profiles_freeze_privileged_fields();

-- Self-update allowed for own row; privilege fields are frozen by trigger above.
drop policy if exists "Users update own non-role fields" on public.profiles;
create policy "Users update own non-role fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
