-- Product units belong to order items, not to the reusable catalog.
-- Existing order_items keep their quantity_unit unchanged.

begin;

create or replace function public.web_list_catalog_products()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, app_security, public, auth, extensions
as $$
  with membership as (select * from public.web_require_membership())
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', product.id,
        'category', product.category::text,
        'name', product.name,
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

create or replace function public.web_save_catalog_product(p_product jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, app_security, public, auth, extensions
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
      tenant_id,
      category,
      name,
      position,
      version,
      created_at,
      updated_at,
      created_by,
      updated_by
    )
    values (
      membership.tenant_id,
      upper(p_product->>'category')::public."ProductCategory",
      trim(p_product->>'name'),
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
      category = upper(p_product->>'category')::public."ProductCategory",
      name = trim(p_product->>'name'),
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
    'version', item.version
  );
end
$$;

alter table public.catalog_products
  drop column if exists default_unit;

revoke all on function public.web_list_catalog_products()
  from public, anon, authenticated;
grant execute on function public.web_list_catalog_products() to authenticated;

revoke all on function public.web_save_catalog_product(jsonb)
  from public, anon, authenticated;
grant execute on function public.web_save_catalog_product(jsonb) to authenticated;

commit;
