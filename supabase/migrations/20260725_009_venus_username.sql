-- Pastelaria Vénus: use the operational username pastelaria_venus.
--
-- Supabase Auth keeps the existing internal email-shaped identifier so the
-- password and account are not recreated. The frontend maps the new visible
-- username to that private identifier.

begin;

do $$
declare
  owner_id uuid;
begin
  select membership.user_id
  into owner_id
  from public.tenant_memberships membership
  where membership.tenant_id = '11111111-1111-4111-8111-111111111111'
    and membership.role = 'OWNER'
    and membership.status = 'ACTIVE'
  order by membership.created_at
  limit 1;

  -- A clean project may receive its first Auth user after migrations.
  if owner_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.users profile
    where lower(profile.username) = 'pastelaria_venus'
      and profile.id <> owner_id
  ) then
    raise exception 'O utilizador pastelaria_venus já pertence a outra conta.';
  end if;

  update auth.users auth_user
  set
    raw_user_meta_data =
      coalesce(auth_user.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('username', 'pastelaria_venus'),
    updated_at = now()
  where auth_user.id = owner_id;

  update public.users profile
  set
    username = 'pastelaria_venus',
    updated_at = now()
  where profile.id = owner_id;
end
$$;

commit;
