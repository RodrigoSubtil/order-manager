-- Order Manager: consistent multi-term search and owner-only business backup export.
--
-- This migration does not delete or rewrite business data. The export deliberately
-- excludes passwords, authentication tokens and management credentials.

begin;

create or replace function public.web_list_orders(
  p_from date default null,
  p_until date default null,
  p_category text default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with
  membership as (
    select * from public.web_require_membership()
  ),
  search_terms as (
    select lower(term) as term
    from regexp_split_to_table(trim(coalesce(p_search, '')), '\s+') as term
    where term <> ''
  ),
  filtered as materialized (
    select order_row.*
    from public.orders order_row
    cross join membership
    where order_row.tenant_id = membership.tenant_id
      and order_row.deleted_at is null
      and (p_from is null or order_row.delivery_date >= p_from)
      and (p_until is null or order_row.delivery_date <= p_until)
      and (
        not exists (select 1 from search_terms)
        or not exists (
          select 1
          from search_terms search_term
          where not (
            lower(order_row.client_name) like '%' || search_term.term || '%'
            or lower(coalesce(order_row.phone, '')) like '%' || search_term.term || '%'
            or exists (
              select 1
              from public.responsibles responsible
              where responsible.id = order_row.responsible_id
                and responsible.tenant_id = membership.tenant_id
                and responsible.deleted_at is null
                and lower(responsible.name) like '%' || search_term.term || '%'
            )
            or exists (
              select 1
              from public.order_items item
              where item.order_id = order_row.id
                and item.tenant_id = membership.tenant_id
                and item.deleted_at is null
                and (
                  lower(item.product_name) like '%' || search_term.term || '%'
                  or lower(coalesce(item.notes, '')) like '%' || search_term.term || '%'
                  or lower(item.category::text) like '%' || search_term.term || '%'
                )
            )
          )
        )
      )
      and (
        p_category is null
        or exists (
          select 1
          from public.order_items item
          where item.order_id = order_row.id
            and item.tenant_id = membership.tenant_id
            and item.deleted_at is null
            and item.category::text = upper(p_category)
        )
      )
  ),
  paged as (
    select *
    from filtered
    order by delivery_date, delivery_time, order_number
    offset (greatest(coalesce(p_page, 1), 1) - 1)
      * least(greatest(coalesce(p_page_size, 25), 1), 100)
    limit least(greatest(coalesce(p_page_size, 25), 1), 100)
  )
  select jsonb_build_object(
    'items',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', order_row.id,
          'orderNumber', order_row.order_number,
          'clientName', order_row.client_name,
          'phone', order_row.phone,
          'responsibleId', order_row.responsible_id,
          'responsibleName', (
            select responsible.name
            from public.responsibles responsible
            where responsible.id = order_row.responsible_id
              and responsible.tenant_id = membership.tenant_id
          ),
          'deliveryDate', order_row.delivery_date,
          'deliveryTime', order_row.delivery_time,
          'version', order_row.version,
          'createdAt', order_row.created_at,
          'items',
          coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', item.id,
                'category', item.category::text,
                'productName', item.product_name,
                'quantityValue', item.quantity_value,
                'quantityUnit', item.quantity_unit::text,
                'notes', item.notes,
                'position', item.position
              )
              order by item.position
            )
            from public.order_items item
            where item.tenant_id = membership.tenant_id
              and item.order_id = order_row.id
              and item.deleted_at is null
          ), '[]'::jsonb)
        )
        order by order_row.delivery_date, order_row.delivery_time, order_row.order_number
      )
      from paged order_row
      cross join membership
    ), '[]'::jsonb),
    'page', greatest(coalesce(p_page, 1), 1),
    'pageSize', least(greatest(coalesce(p_page_size, 25), 1), 100),
    'total', (select count(*) from filtered)
  )
$$;

create or replace function public.web_export_tenant_backup()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.web_membership_context;
begin
  membership := public.web_require_management_access();

  return jsonb_build_object(
    'format', 'order-manager-business-backup',
    'formatVersion', 1,
    'exportedAt', now(),
    'tenant', (
      select to_jsonb(tenant_row)
      from public.tenants tenant_row
      where tenant_row.id = membership.tenant_id
    ),
    'users', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', user_row.id,
          'displayName', user_row.display_name,
          'status', user_row.status,
          'createdAt', user_row.created_at,
          'updatedAt', user_row.updated_at
        )
        order by user_row.created_at
      )
      from public.users user_row
      where exists (
        select 1
        from public.tenant_memberships member
        where member.tenant_id = membership.tenant_id
          and member.user_id = user_row.id
      )
    ), '[]'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(to_jsonb(member) order by member.created_at)
      from public.tenant_memberships member
      where member.tenant_id = membership.tenant_id
    ), '[]'::jsonb),
    'catalogProducts', coalesce((
      select jsonb_agg(to_jsonb(product) order by product.created_at)
      from public.catalog_products product
      where product.tenant_id = membership.tenant_id
    ), '[]'::jsonb),
    'responsibles', coalesce((
      select jsonb_agg(to_jsonb(responsible) order by responsible.created_at)
      from public.responsibles responsible
      where responsible.tenant_id = membership.tenant_id
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(to_jsonb(order_row) order by order_row.created_at)
      from public.orders order_row
      where order_row.tenant_id = membership.tenant_id
    ), '[]'::jsonb),
    'orderItems', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.created_at)
      from public.order_items item
      where item.tenant_id = membership.tenant_id
    ), '[]'::jsonb)
  );
end
$$;

revoke all on function public.web_export_tenant_backup() from public, anon;
grant execute on function public.web_export_tenant_backup() to authenticated;

commit;
