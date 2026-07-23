-- Order Manager: visible authentication by username.
-- Supabase Auth still requires an email-shaped internal identity, but public
-- application data and RPC responses expose only the username.

begin;

alter table public.users
  add column if not exists username text;

with normalized as (
  select
    profile.id,
    btrim(
      lower(
        regexp_replace(
          coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'username', ''),
            split_part(auth_user.email, '@', 1),
            'user-' || left(profile.id::text, 8)
          ),
          '[^a-zA-Z0-9._-]+',
          '-',
          'g'
        )
      ),
      '._-'
    ) as candidate
  from public.users profile
  join auth.users auth_user on auth_user.id = profile.id
)
update public.users profile
set username = case
  when length(normalized.candidate) between 3 and 32
    and normalized.candidate ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'
    then normalized.candidate
  else 'user-' || left(profile.id::text, 8)
end
from normalized
where normalized.id = profile.id
  and profile.username is null;

update public.users
set username = 'user-' || left(id::text, 8)
where username is null;

with duplicates as (
  select
    id,
    row_number() over (partition by lower(username) order by id) as position
  from public.users
)
update public.users profile
set username = left(profile.username, 23) || '-' || left(profile.id::text, 8)
from duplicates
where duplicates.id = profile.id
  and duplicates.position > 1;

alter table public.users
  alter column username set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_username_format'
  ) then
    alter table public.users
      add constraint users_username_format
      check (
        username = lower(username)
        and username ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'
      );
  end if;
end
$$;

create unique index if not exists users_username_unique
  on public.users (lower(username));

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  normalized_username text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  normalized_username := btrim(
    lower(
      regexp_replace(
        coalesce(
          nullif(new.raw_user_meta_data ->> 'username', ''),
          split_part(new.email, '@', 1),
          'user-' || left(new.id::text, 8)
        ),
        '[^a-zA-Z0-9._-]+',
        '-',
        'g'
      )
    ),
    '._-'
  );

  if length(normalized_username) not between 3 and 32
    or normalized_username !~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'
  then
    normalized_username := 'user-' || left(new.id::text, 8);
  end if;

  insert into public.users (id, display_name, username, status, created_at, updated_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      normalized_username,
      'Utilizador'
    ),
    normalized_username,
    'ACTIVE',
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    username = excluded.username,
    status = 'ACTIVE',
    updated_at = now();
  return new;
end
$$;

drop trigger if exists order_manager_sync_auth_user_delete on auth.users;
drop trigger if exists order_manager_sync_auth_user_upsert on auth.users;
drop trigger if exists order_manager_sync_auth_user on auth.users;
create trigger order_manager_sync_auth_user
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

do $$
begin
  if exists (
    select 1
    from pg_type type_definition
    join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
    join pg_attribute attribute on attribute.attrelid = type_definition.typrelid
    where type_namespace.nspname = 'public'
      and type_definition.typname = 'web_membership_context'
      and attribute.attname = 'email'
      and not attribute.attisdropped
  ) then
    alter type public.web_membership_context
      rename attribute email to username;
  end if;
end
$$;

create or replace function public.web_active_membership()
returns setof public.web_membership_context
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    membership.tenant_id,
    tenant.name,
    tenant.slug,
    membership.user_id,
    profile.display_name,
    profile.username,
    membership.role
  from public.tenant_memberships membership
  join public.tenants tenant on tenant.id = membership.tenant_id
  join public.users profile on profile.id = membership.user_id
  where membership.user_id = auth.uid()
    and membership.status = 'ACTIVE'
    and membership.is_default = true
    and tenant.status = 'ACTIVE'
    and profile.status = 'ACTIVE'
  limit 1
$$;

create or replace function public.web_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into membership from public.web_active_membership();
  if membership.tenant_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', membership.user_id,
      'username', membership.username,
      'displayName', membership.display_name
    ),
    'tenant', jsonb_build_object(
      'id', membership.tenant_id,
      'name', membership.tenant_name,
      'slug', membership.tenant_slug
    ),
    'role', membership.role::text
  );
end
$$;

alter table public.users
  drop column if exists email;

commit;
