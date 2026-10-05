-- Order Manager: frontend React -> Supabase Auth + PostgreSQL/RLS.
-- Apply only to the isolated Supabase project after reviewing in SQL Editor.
-- It does not use service_role in the browser and never accepts tenant_id from
-- the frontend. The active tenant is derived from auth.uid() and the default
-- active membership.

begin;

-- The product has only two roles. Existing fictitious ADMIN memberships become
-- OPERATOR. The old enum value can remain physically in PostgreSQL, but a
-- constraint prevents it from being used again.
update public.tenant_memberships
set role = 'OPERATOR'
where role::text = 'ADMIN';

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_role_owner_or_operator;
alter table public.tenant_memberships
  add constraint tenant_memberships_role_owner_or_operator
  check (role::text in ('OWNER', 'OPERATOR'));

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'web_membership_context'
  ) then
    create type public.web_membership_context as (
      tenant_id uuid,
      tenant_name text,
      tenant_slug text,
      user_id uuid,
      display_name text,
      email text,
      role "MembershipRole"
    );
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
    profile.email,
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

create or replace function public.web_require_membership()
returns public.web_membership_context
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
begin
  select * into membership from public.web_active_membership();
  if membership.tenant_id is null then
    raise exception 'active company membership required' using errcode = '42501';
  end if;
  return membership;
end
$$;

create or replace function public.web_require_owner()
returns public.web_membership_context
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
begin
  membership := public.web_require_membership();
  if membership.role <> 'OWNER' then
    raise exception 'OWNER role required' using errcode = '42501';
  end if;
  return membership;
end
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
      'email', membership.email,
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

create or replace function public.web_list_catalog_products()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with membership as (select * from public.web_require_membership())
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', product.id,
        'category', product.category::text,
        'name', product.name,
        'defaultUnit', product.default_unit::text,
        'version', product.version
      ) order by product.category, product.position, product.name
    ),
    '[]'::jsonb
  )
  from public.catalog_products product, membership
  where product.tenant_id = membership.tenant_id
    and product.deleted_at is null
    and product.is_active = true
$$;

create or replace function public.web_list_responsibles()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with membership as (select * from public.web_require_membership())
  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', responsible.id, 'name', responsible.name, 'version', responsible.version)
      order by responsible.position, responsible.name
    ),
    '[]'::jsonb
  )
  from public.responsibles responsible, membership
  where responsible.tenant_id = membership.tenant_id
    and responsible.deleted_at is null
    and responsible.is_active = true
$$;

create or replace function public.web_list_orders(
  p_from date default null,
  p_until date default null,
  p_category text default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  total_count integer;
  page_items jsonb;
begin
  membership := public.web_require_membership();
  with filtered as (
    select order_row.*
    from public.orders order_row
    where order_row.tenant_id = membership.tenant_id
      and order_row.deleted_at is null
      and (p_from is null or order_row.delivery_date >= p_from)
      and (p_until is null or order_row.delivery_date <= p_until)
      and (
        p_search is null or trim(p_search) = '' or
        order_row.client_name ilike '%' || trim(p_search) || '%' or
        coalesce(order_row.phone, '') ilike '%' || trim(p_search) || '%' or
        exists (
          select 1 from public.responsibles responsible
          where responsible.id = order_row.responsible_id
            and responsible.tenant_id = membership.tenant_id
            and responsible.name ilike '%' || trim(p_search) || '%'
        )
      )
      and (
        p_category is null or exists (
          select 1 from public.order_items item
          where item.order_id = order_row.id
            and item.tenant_id = membership.tenant_id
            and item.deleted_at is null
            and item.category::text = upper(p_category)
        )
      )
  )
  select count(*) into total_count from filtered;

  with filtered as (
    select order_row.*
    from public.orders order_row
    where order_row.tenant_id = membership.tenant_id
      and order_row.deleted_at is null
      and (p_from is null or order_row.delivery_date >= p_from)
      and (p_until is null or order_row.delivery_date <= p_until)
      and (
        p_search is null or trim(p_search) = '' or
        order_row.client_name ilike '%' || trim(p_search) || '%' or
        coalesce(order_row.phone, '') ilike '%' || trim(p_search) || '%' or
        exists (
          select 1 from public.responsibles responsible
          where responsible.id = order_row.responsible_id
            and responsible.tenant_id = membership.tenant_id
            and responsible.name ilike '%' || trim(p_search) || '%'
        ) or exists (
          select 1 from public.order_items item
          where item.order_id = order_row.id
            and item.tenant_id = membership.tenant_id
            and item.deleted_at is null
            and item.product_name ilike '%' || trim(p_search) || '%'
        )
      )
      and (p_category is null or exists (
        select 1 from public.order_items item
        where item.order_id = order_row.id and item.tenant_id = membership.tenant_id
          and item.deleted_at is null and item.category::text = upper(p_category)
      ))
    order by order_row.delivery_date, order_row.delivery_time nulls last, order_row.order_number
    offset (safe_page - 1) * safe_page_size limit safe_page_size
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', order_row.id,
      'orderNumber', order_row.order_number,
      'clientName', order_row.client_name,
      'phone', order_row.phone,
      'responsibleId', order_row.responsible_id,
      'responsibleName', responsible.name,
      'deliveryDate', order_row.delivery_date,
      'deliveryTime', order_row.delivery_time,
      'version', order_row.version,
      'createdAt', order_row.created_at,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', item.id, 'category', item.category::text, 'productName', item.product_name,
          'quantityValue', item.quantity_value, 'quantityUnit', item.quantity_unit::text,
          'notes', item.notes, 'position', item.position
        ) order by item.position)
        from public.order_items item
        where item.tenant_id = membership.tenant_id
          and item.order_id = order_row.id and item.deleted_at is null
      ), '[]'::jsonb)
    )
  ), '[]'::jsonb) into page_items
  from filtered order_row
  left join public.responsibles responsible
    on responsible.id = order_row.responsible_id and responsible.tenant_id = membership.tenant_id;

  return jsonb_build_object('items', page_items, 'page', safe_page, 'pageSize', safe_page_size, 'total', total_count);
end
$$;

create or replace function public.web_save_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
  saved_order public.orders;
  item jsonb;
  item_position integer := 0;
  requested_id uuid := nullif(p_order->>'id', '')::uuid;
  requested_version integer := nullif(p_order->>'version', '')::integer;
begin
  membership := public.web_require_membership();
  if length(trim(coalesce(p_order->>'clientName', ''))) < 2 then
    raise exception 'client name must have at least two characters' using errcode = '23514';
  end if;
  if coalesce(jsonb_array_length(p_order->'items'), 0) = 0 then
    raise exception 'an order requires at least one item' using errcode = '23514';
  end if;

  if requested_id is null then
    update public.tenants set next_order_number = next_order_number + 1, updated_at = now(), updated_by = membership.user_id
      where id = membership.tenant_id
      returning next_order_number - 1 into saved_order.order_number;
    insert into public.orders (
      tenant_id, order_number, client_name, phone, responsible_id, delivery_date, delivery_time,
      version, created_at, updated_at, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.order_number, trim(p_order->>'clientName'),
      nullif(p_order->>'phone', ''), nullif(p_order->>'responsibleId', '')::uuid,
      (p_order->>'deliveryDate')::date, nullif(p_order->>'deliveryTime', '')::time,
      1, now(), now(), membership.user_id, membership.user_id
    ) returning * into saved_order;
  else
    update public.orders set
      client_name = trim(p_order->>'clientName'),
      phone = nullif(p_order->>'phone', ''),
      responsible_id = nullif(p_order->>'responsibleId', '')::uuid,
      delivery_date = (p_order->>'deliveryDate')::date,
      delivery_time = nullif(p_order->>'deliveryTime', '')::time,
      version = version + 1, updated_at = now(), updated_by = membership.user_id
    where id = requested_id and tenant_id = membership.tenant_id and deleted_at is null and version = requested_version
    returning * into saved_order;
    if saved_order.id is null then
      raise exception 'order was changed by another user' using errcode = '40001';
    end if;
    update public.order_items set deleted_at = now(), deleted_by = membership.user_id
      where tenant_id = membership.tenant_id and order_id = saved_order.id and deleted_at is null;
  end if;

  for item in select * from jsonb_array_elements(p_order->'items') loop
    if length(trim(coalesce(item->>'productName', ''))) = 0 then
      raise exception 'an order item requires a product name' using errcode = '23514';
    end if;
    insert into public.order_items (
      tenant_id, order_id, category, product_name, quantity_value, quantity_unit, notes, position,
      created_at, updated_at, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.id, upper(item->>'category')::"ProductCategory",
      trim(item->>'productName'), (item->>'quantityValue')::numeric, upper(item->>'quantityUnit')::"QuantityUnit",
      nullif(item->>'notes', ''), item_position, now(), now(), membership.user_id, membership.user_id
    );
    item_position := item_position + 1;
  end loop;
  return jsonb_build_object('id', saved_order.id, 'version', saved_order.version);
end
$$;

create or replace function public.web_delete_order(p_order_id uuid, p_version integer)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare membership public.web_membership_context;
begin
  membership := public.web_require_owner();
  update public.orders set deleted_at = now(), deleted_by = membership.user_id, updated_at = now(), updated_by = membership.user_id, version = version + 1
  where id = p_order_id and tenant_id = membership.tenant_id and deleted_at is null and version = p_version;
  if not found then raise exception 'order was not found or changed' using errcode = '40001'; end if;
end
$$;

create or replace function public.web_preview_bulk_delete_orders(p_from date, p_until date)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with membership as (select * from public.web_require_owner()),
  matches as (
    select id, order_number, client_name, delivery_date from public.orders order_row, membership
    where order_row.tenant_id = membership.tenant_id and order_row.deleted_at is null
      and (p_from is null or order_row.delivery_date >= p_from) and order_row.delivery_date <= p_until
    order by order_row.delivery_date, order_row.order_number
  )
  select jsonb_build_object(
    'total', (select count(*) from matches),
    'preview', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'orderNumber', order_number, 'clientName', client_name, 'deliveryDate', delivery_date)) from (select * from matches limit 100) sample), '[]'::jsonb),
    'truncated', (select count(*) > 100 from matches)
  )
$$;

create or replace function public.web_confirm_bulk_delete_orders(p_from date, p_until date)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare membership public.web_membership_context; affected integer;
begin
  membership := public.web_require_owner();
  update public.orders set deleted_at = now(), deleted_by = membership.user_id, updated_at = now(), updated_by = membership.user_id, version = version + 1
  where tenant_id = membership.tenant_id and deleted_at is null
    and (p_from is null or delivery_date >= p_from) and delivery_date <= p_until;
  get diagnostics affected = row_count;
  return jsonb_build_object('deleted', affected);
end
$$;

-- Catalog/responsible mutations are OWNER-only. They use soft deletion and
-- optimistic versions, just like orders.
create or replace function public.web_save_catalog_product(p_product jsonb)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare membership public.web_membership_context; item public.catalog_products; requested_id uuid := nullif(p_product->>'id', '')::uuid;
begin
  membership := public.web_require_owner();
  if length(trim(coalesce(p_product->>'name', ''))) = 0 then
    raise exception 'catalog product name is required' using errcode = '23514';
  end if;
  if requested_id is null then
    insert into public.catalog_products (tenant_id, category, name, default_unit, position, version, created_at, updated_at, created_by, updated_by)
    values (membership.tenant_id, upper(p_product->>'category')::"ProductCategory", trim(p_product->>'name'), upper(p_product->>'defaultUnit')::"QuantityUnit", 0, 1, now(), now(), membership.user_id, membership.user_id)
    returning * into item;
  else
    update public.catalog_products set category = upper(p_product->>'category')::"ProductCategory", name = trim(p_product->>'name'), default_unit = upper(p_product->>'defaultUnit')::"QuantityUnit", version = version + 1, updated_at = now(), updated_by = membership.user_id
    where id = requested_id and tenant_id = membership.tenant_id and deleted_at is null and version = (p_product->>'version')::integer returning * into item;
    if item.id is null then raise exception 'catalog product was not found or changed' using errcode = '40001'; end if;
  end if;
  return jsonb_build_object('id', item.id, 'category', item.category::text, 'name', item.name, 'defaultUnit', item.default_unit::text, 'version', item.version);
end $$;

create or replace function public.web_delete_catalog_product(p_product_id uuid, p_version integer)
returns void language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare membership public.web_membership_context;
begin
  membership := public.web_require_owner();
  update public.catalog_products set deleted_at = now(), deleted_by = membership.user_id, updated_at = now(), updated_by = membership.user_id, version = version + 1
  where id = p_product_id and tenant_id = membership.tenant_id and deleted_at is null and version = p_version;
  if not found then raise exception 'catalog product was not found or changed' using errcode = '40001'; end if;
end $$;

create or replace function public.web_save_responsible(p_responsible jsonb)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare membership public.web_membership_context; item public.responsibles; requested_id uuid := nullif(p_responsible->>'id', '')::uuid;
begin
  membership := public.web_require_owner();
  if length(trim(coalesce(p_responsible->>'name', ''))) = 0 then
    raise exception 'responsible name is required' using errcode = '23514';
  end if;
  if requested_id is null then
    insert into public.responsibles (tenant_id, name, position, version, created_at, updated_at, created_by, updated_by)
    values (membership.tenant_id, trim(p_responsible->>'name'), 0, 1, now(), now(), membership.user_id, membership.user_id)
    returning * into item;
  else
    update public.responsibles set name = trim(p_responsible->>'name'), version = version + 1, updated_at = now(), updated_by = membership.user_id
    where id = requested_id and tenant_id = membership.tenant_id and deleted_at is null and version = (p_responsible->>'version')::integer returning * into item;
    if item.id is null then raise exception 'responsible was not found or changed' using errcode = '40001'; end if;
  end if;
  return jsonb_build_object('id', item.id, 'name', item.name, 'version', item.version);
end $$;

create or replace function public.web_delete_responsible(p_responsible_id uuid, p_version integer)
returns void language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare membership public.web_membership_context;
begin
  membership := public.web_require_owner();
  update public.responsibles set deleted_at = now(), deleted_by = membership.user_id, updated_at = now(), updated_by = membership.user_id, version = version + 1
  where id = p_responsible_id and tenant_id = membership.tenant_id and deleted_at is null and version = p_version;
  if not found then raise exception 'responsible was not found or changed' using errcode = '40001'; end if;
end $$;

revoke all on function public.web_active_membership() from public;
revoke all on function public.web_require_membership() from public;
revoke all on function public.web_require_owner() from public;
grant execute on function public.web_session_context() to authenticated;
grant execute on function public.web_list_catalog_products() to authenticated;
grant execute on function public.web_list_responsibles() to authenticated;
grant execute on function public.web_list_orders(date, date, text, text, integer, integer) to authenticated;
grant execute on function public.web_save_order(jsonb) to authenticated;
grant execute on function public.web_delete_order(uuid, integer) to authenticated;
grant execute on function public.web_preview_bulk_delete_orders(date, date) to authenticated;
grant execute on function public.web_confirm_bulk_delete_orders(date, date) to authenticated;
grant execute on function public.web_save_catalog_product(jsonb) to authenticated;
grant execute on function public.web_delete_catalog_product(uuid, integer) to authenticated;
grant execute on function public.web_save_responsible(jsonb) to authenticated;
grant execute on function public.web_delete_responsible(uuid, integer) to authenticated;

commit;
