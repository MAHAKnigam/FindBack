-- Admin-only user directory and role management.
-- Role changes are performed only through SECURITY DEFINER RPCs.

create or replace function public.get_admin_users()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role::text) = 'admin'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  return query
  select p.id,
         coalesce(nullif(trim(p.full_name), ''), 'FindBack user'),
         p.email,
         p.role::text
  from public.profiles p
  order by lower(coalesce(p.full_name, '')), lower(coalesce(p.email, ''));
end;
$$;

create or replace function public.update_admin_user_role(
  p_user_id uuid,
  p_new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_role text;
  v_admin_count bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role::text) = 'admin'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if p_new_role not in ('user', 'admin') then
    raise exception 'Role must be user or admin.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own administrator role.';
  end if;

  select p.role::text into v_current_role
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'User profile not found.';
  end if;

  if lower(v_current_role) = 'admin' and p_new_role = 'user' then
    select count(*) into v_admin_count
    from public.profiles p
    where lower(p.role::text) = 'admin';

    if v_admin_count <= 1 then
      raise exception 'The last administrator cannot be demoted.';
    end if;
  end if;

  update public.profiles
  set role = case when p_new_role = 'admin' then 'admin' else 'user' end
  where id = p_user_id;
end;
$$;

revoke all on function public.get_admin_users() from public;
revoke all on function public.update_admin_user_role(uuid, text) from public;
grant execute on function public.get_admin_users() to authenticated;
grant execute on function public.update_admin_user_role(uuid, text) to authenticated;
