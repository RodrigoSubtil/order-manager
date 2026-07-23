-- Order Manager: server-enforced management access.
--
-- The normal Supabase Auth session can operate orders. Catalog and responsible
-- mutations additionally require a short-lived management unlock tied to the
-- current Supabase Auth session_id. No management password is stored in this
-- migration or exposed to the browser bundle.

begin;

create extension if not exists pgcrypto;

create table if not exists public.tenant_management_credentials (
  tenant_id uuid primary key references public.tenants (id) on delete restrict,
  password_hash text not null check (length(password_hash) >= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

create table if not exists public.tenant_management_sessions (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  session_id text not null,
  unlocked_until timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id, session_id)
);

create index if not exists tenant_management_sessions_expiry_idx
  on public.tenant_management_sessions (unlocked_until);

alter table public.tenant_management_credentials enable row level security;
alter table public.tenant_management_sessions enable row level security;

revoke all on table public.tenant_management_credentials,
  public.tenant_management_sessions
from anon, authenticated;

create or replace function public.web_current_session_id()
returns text
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_session_id text;
begin
  current_session_id := nullif(auth.jwt() ->> 'session_id', '');
  if current_session_id is null then
    raise exception 'valid authenticated session required' using errcode = '42501';
  end if;
  return current_session_id;
end
$$;

create or replace function public.web_management_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  current_session_id text;
  is_configured boolean;
  access_until timestamptz;
begin
  membership := public.web_require_membership();
  current_session_id := public.web_current_session_id();

  select exists (
    select 1
    from public.tenant_management_credentials credential
    where credential.tenant_id = membership.tenant_id
  ) into is_configured;

  select management_session.unlocked_until
  into access_until
  from public.tenant_management_sessions management_session
  where management_session.tenant_id = membership.tenant_id
    and management_session.user_id = membership.user_id
    and management_session.session_id = current_session_id
    and management_session.unlocked_until > now();

  return jsonb_build_object(
    'configured', is_configured,
    'unlocked', access_until is not null,
    'unlockedUntil', access_until
  );
end
$$;

create or replace function public.web_initialize_management_password(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  current_session_id text;
  inserted_count integer;
begin
  membership := public.web_require_owner();
  current_session_id := public.web_current_session_id();

  if length(coalesce(p_password, '')) < 12 or length(p_password) > 128 then
    return jsonb_build_object(
      'configured', false,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'A senha de gerenciamento deve ter entre 12 e 128 caracteres.'
    );
  end if;

  insert into public.tenant_management_credentials (
    tenant_id,
    password_hash,
    created_at,
    updated_at,
    updated_by
  )
  values (
    membership.tenant_id,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    now(),
    now(),
    membership.user_id
  )
  on conflict (tenant_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 1 then
    return jsonb_build_object(
      'configured', true,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'A senha gerencial já foi configurada.'
    );
  end if;

  insert into public.tenant_management_sessions (
    tenant_id,
    user_id,
    session_id,
    unlocked_until,
    failed_attempts,
    locked_until,
    created_at,
    updated_at
  )
  values (
    membership.tenant_id,
    membership.user_id,
    current_session_id,
    now() + interval '15 minutes',
    0,
    null,
    now(),
    now()
  )
  on conflict (tenant_id, user_id, session_id) do update set
    unlocked_until = excluded.unlocked_until,
    failed_attempts = 0,
    locked_until = null,
    updated_at = now();

  return public.web_management_status();
end
$$;

create or replace function public.web_unlock_management(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  current_session_id text;
  stored_hash text;
  attempts integer;
  blocked_until timestamptz;
  next_attempts integer;
begin
  membership := public.web_require_owner();
  current_session_id := public.web_current_session_id();

  select credential.password_hash
  into stored_hash
  from public.tenant_management_credentials credential
  where credential.tenant_id = membership.tenant_id;

  if stored_hash is null then
    return jsonb_build_object(
      'configured', false,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'O acesso gerencial ainda não foi configurado.'
    );
  end if;

  insert into public.tenant_management_sessions (
    tenant_id,
    user_id,
    session_id,
    failed_attempts,
    created_at,
    updated_at
  )
  values (
    membership.tenant_id,
    membership.user_id,
    current_session_id,
    0,
    now(),
    now()
  )
  on conflict (tenant_id, user_id, session_id) do nothing;

  select management_session.failed_attempts, management_session.locked_until
  into attempts, blocked_until
  from public.tenant_management_sessions management_session
  where management_session.tenant_id = membership.tenant_id
    and management_session.user_id = membership.user_id
    and management_session.session_id = current_session_id
  for update;

  if blocked_until is not null and blocked_until > now() then
    return jsonb_build_object(
      'configured', true,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'Muitas tentativas incorretas. Aguarde 15 minutos e tente novamente.'
    );
  end if;

  if extensions.crypt(coalesce(p_password, ''), stored_hash) <> stored_hash then
    next_attempts := case when blocked_until is not null then 1 else attempts + 1 end;

    update public.tenant_management_sessions
    set
      failed_attempts = case when next_attempts >= 5 then 0 else next_attempts end,
      locked_until = case when next_attempts >= 5 then now() + interval '15 minutes' else null end,
      unlocked_until = null,
      updated_at = now()
    where tenant_id = membership.tenant_id
      and user_id = membership.user_id
      and session_id = current_session_id;

    return jsonb_build_object(
      'configured', true,
      'unlocked', false,
      'unlockedUntil', null,
      'error', case
        when next_attempts >= 5
          then 'Muitas tentativas incorretas. Aguarde 15 minutos e tente novamente.'
        else 'Senha de gerenciamento incorreta.'
      end
    );
  end if;

  update public.tenant_management_sessions
  set
    unlocked_until = now() + interval '15 minutes',
    failed_attempts = 0,
    locked_until = null,
    updated_at = now()
  where tenant_id = membership.tenant_id
    and user_id = membership.user_id
    and session_id = current_session_id;

  return public.web_management_status();
end
$$;

create or replace function public.web_lock_management()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  current_session_id text;
begin
  membership := public.web_require_membership();
  current_session_id := public.web_current_session_id();

  delete from public.tenant_management_sessions
  where tenant_id = membership.tenant_id
    and user_id = membership.user_id
    and session_id = current_session_id;
end
$$;

create or replace function public.web_require_management_access()
returns public.web_membership_context
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  current_session_id text;
begin
  membership := public.web_require_owner();
  current_session_id := public.web_current_session_id();

  if not exists (
    select 1
    from public.tenant_management_sessions management_session
    where management_session.tenant_id = membership.tenant_id
      and management_session.user_id = membership.user_id
      and management_session.session_id = current_session_id
      and management_session.unlocked_until > now()
  ) then
    raise exception 'management password required' using errcode = '42501';
  end if;

  return membership;
end
$$;

-- Order operations remain available to every authenticated company operator.
create or replace function public.web_delete_order(p_order_id uuid, p_version integer)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare membership public.web_membership_context;
begin
  membership := public.web_require_membership();
  update public.orders
  set
    deleted_at = now(),
    deleted_by = membership.user_id,
    updated_at = now(),
    updated_by = membership.user_id,
    version = version + 1
  where id = p_order_id
    and tenant_id = membership.tenant_id
    and deleted_at is null
    and version = p_version;
  if not found then
    raise exception 'order was not found or changed' using errcode = '40001';
  end if;
end
$$;

create or replace function public.web_preview_bulk_delete_orders(p_from date, p_until date)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with membership as (select * from public.web_require_membership()),
  matches as (
    select id, order_number, client_name, delivery_date
    from public.orders order_row, membership
    where order_row.tenant_id = membership.tenant_id
      and order_row.deleted_at is null
      and (p_from is null or order_row.delivery_date >= p_from)
      and order_row.delivery_date <= p_until
    order by order_row.delivery_date, order_row.order_number
  )
  select jsonb_build_object(
    'total', (select count(*) from matches),
    'preview', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'orderNumber', order_number,
        'clientName', client_name,
        'deliveryDate', delivery_date
      ))
      from (select * from matches limit 100) sample
    ), '[]'::jsonb),
    'truncated', (select count(*) > 100 from matches)
  )
$$;

create or replace function public.web_confirm_bulk_delete_orders(p_from date, p_until date)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  affected integer;
begin
  membership := public.web_require_membership();
  update public.orders
  set
    deleted_at = now(),
    deleted_by = membership.user_id,
    updated_at = now(),
    updated_by = membership.user_id,
    version = version + 1
  where tenant_id = membership.tenant_id
    and deleted_at is null
    and (p_from is null or delivery_date >= p_from)
    and delivery_date <= p_until;
  get diagnostics affected = row_count;
  return jsonb_build_object('deleted', affected);
end
$$;

-- Catalog and responsible mutations require the second management password.
create or replace function public.web_save_catalog_product(p_product jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  item public.catalog_products;
  requested_id uuid := nullif(p_product->>'id', '')::uuid;
begin
  membership := public.web_require_management_access();
  if length(trim(coalesce(p_product->>'name', ''))) = 0 then
    raise exception 'catalog product name is required' using errcode = '23514';
  end if;
  if requested_id is null then
    insert into public.catalog_products (
      tenant_id, category, name, default_unit, position, version,
      created_at, updated_at, created_by, updated_by
    )
    values (
      membership.tenant_id,
      upper(p_product->>'category')::"ProductCategory",
      trim(p_product->>'name'),
      upper(p_product->>'defaultUnit')::"QuantityUnit",
      0,
      1,
      now(),
      now(),
      membership.user_id,
      membership.user_id
    )
    returning * into item;
  else
    update public.catalog_products
    set
      category = upper(p_product->>'category')::"ProductCategory",
      name = trim(p_product->>'name'),
      default_unit = upper(p_product->>'defaultUnit')::"QuantityUnit",
      version = version + 1,
      updated_at = now(),
      updated_by = membership.user_id
    where id = requested_id
      and tenant_id = membership.tenant_id
      and deleted_at is null
      and version = (p_product->>'version')::integer
    returning * into item;
    if item.id is null then
      raise exception 'catalog product was not found or changed' using errcode = '40001';
    end if;
  end if;
  return jsonb_build_object(
    'id', item.id,
    'category', item.category::text,
    'name', item.name,
    'defaultUnit', item.default_unit::text,
    'version', item.version
  );
end
$$;

create or replace function public.web_delete_catalog_product(
  p_product_id uuid,
  p_version integer
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare membership public.web_membership_context;
begin
  membership := public.web_require_management_access();
  update public.catalog_products
  set
    deleted_at = now(),
    deleted_by = membership.user_id,
    updated_at = now(),
    updated_by = membership.user_id,
    version = version + 1
  where id = p_product_id
    and tenant_id = membership.tenant_id
    and deleted_at is null
    and version = p_version;
  if not found then
    raise exception 'catalog product was not found or changed' using errcode = '40001';
  end if;
end
$$;

create or replace function public.web_save_responsible(p_responsible jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  item public.responsibles;
  requested_id uuid := nullif(p_responsible->>'id', '')::uuid;
begin
  membership := public.web_require_management_access();
  if length(trim(coalesce(p_responsible->>'name', ''))) = 0 then
    raise exception 'responsible name is required' using errcode = '23514';
  end if;
  if requested_id is null then
    insert into public.responsibles (
      tenant_id, name, position, version, created_at, updated_at, created_by, updated_by
    )
    values (
      membership.tenant_id,
      trim(p_responsible->>'name'),
      0,
      1,
      now(),
      now(),
      membership.user_id,
      membership.user_id
    )
    returning * into item;
  else
    update public.responsibles
    set
      name = trim(p_responsible->>'name'),
      version = version + 1,
      updated_at = now(),
      updated_by = membership.user_id
    where id = requested_id
      and tenant_id = membership.tenant_id
      and deleted_at is null
      and version = (p_responsible->>'version')::integer
    returning * into item;
    if item.id is null then
      raise exception 'responsible was not found or changed' using errcode = '40001';
    end if;
  end if;
  return jsonb_build_object(
    'id', item.id,
    'name', item.name,
    'version', item.version
  );
end
$$;

create or replace function public.web_delete_responsible(
  p_responsible_id uuid,
  p_version integer
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare membership public.web_membership_context;
begin
  membership := public.web_require_management_access();
  update public.responsibles
  set
    deleted_at = now(),
    deleted_by = membership.user_id,
    updated_at = now(),
    updated_by = membership.user_id,
    version = version + 1
  where id = p_responsible_id
    and tenant_id = membership.tenant_id
    and deleted_at is null
    and version = p_version;
  if not found then
    raise exception 'responsible was not found or changed' using errcode = '40001';
  end if;
end
$$;

revoke all on function public.web_current_session_id() from public;
revoke all on function public.web_require_management_access() from public;

grant execute on function public.web_management_status() to authenticated;
grant execute on function public.web_initialize_management_password(text) to authenticated;
grant execute on function public.web_unlock_management(text) to authenticated;
grant execute on function public.web_lock_management() to authenticated;

commit;
