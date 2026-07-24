-- Order Manager: complete orders, retain them for seven days and then purge.
-- Existing active orders and their items are not modified by this migration.

begin;

alter table public.orders
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.users (id) on delete set null;

create index if not exists orders_tenant_completed_at_idx
  on public.orders (tenant_id, completed_at)
  where completed_at is not null;

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
set search_path = pg_catalog, app_security, public, auth, extensions
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
      and order_row.completed_at is null
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

create or replace function public.web_save_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, app_security, public, auth, extensions
as $$
declare
  membership public.web_membership_context;
  saved_order public.orders;
  item jsonb;
  item_position integer := 0;
  requested_id uuid := nullif(p_order->>'id', '')::uuid;
  requested_version integer := nullif(p_order->>'version', '')::integer;
  requested_delivery_date date := nullif(p_order->>'deliveryDate', '')::date;
begin
  membership := public.web_require_membership();
  if length(trim(coalesce(p_order->>'clientName', ''))) < 2 then
    raise exception 'Indique um nome de cliente válido.' using errcode = '23514';
  end if;
  if requested_delivery_date is null or requested_delivery_date < current_date then
    raise exception 'A data de entrega não pode ser anterior a hoje.' using errcode = '23514';
  end if;
  if coalesce(jsonb_array_length(p_order->'items'), 0) = 0 then
    raise exception 'Adicione pelo menos um produto.' using errcode = '23514';
  end if;

  if requested_id is null then
    update public.tenants
    set
      next_order_number = next_order_number + 1,
      updated_at = now(),
      updated_by = membership.user_id
    where id = membership.tenant_id
    returning next_order_number - 1 into saved_order.order_number;

    insert into public.orders (
      tenant_id, order_number, client_name, phone, responsible_id, delivery_date, delivery_time,
      version, created_at, updated_at, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.order_number, trim(p_order->>'clientName'),
      nullif(p_order->>'phone', ''), nullif(p_order->>'responsibleId', '')::uuid,
      requested_delivery_date, nullif(p_order->>'deliveryTime', '')::time,
      1, now(), now(), membership.user_id, membership.user_id
    )
    returning * into saved_order;
  else
    update public.orders
    set
      client_name = trim(p_order->>'clientName'),
      phone = nullif(p_order->>'phone', ''),
      responsible_id = nullif(p_order->>'responsibleId', '')::uuid,
      delivery_date = requested_delivery_date,
      delivery_time = nullif(p_order->>'deliveryTime', '')::time,
      version = version + 1,
      updated_at = now(),
      updated_by = membership.user_id
    where id = requested_id
      and tenant_id = membership.tenant_id
      and deleted_at is null
      and completed_at is null
      and version = requested_version
    returning * into saved_order;

    if saved_order.id is null then
      raise exception 'A encomenda foi alterada ou concluída por outro utilizador.'
        using errcode = '40001';
    end if;

    update public.order_items
    set deleted_at = now(), deleted_by = membership.user_id
    where tenant_id = membership.tenant_id
      and order_id = saved_order.id
      and deleted_at is null;
  end if;

  for item in select * from jsonb_array_elements(p_order->'items') loop
    if length(trim(coalesce(item->>'productName', ''))) = 0 then
      raise exception 'Indique o produto.' using errcode = '23514';
    end if;

    insert into public.order_items (
      tenant_id, order_id, category, product_name, quantity_value, quantity_unit, notes, position,
      created_at, updated_at, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.id, upper(item->>'category')::public."ProductCategory",
      trim(item->>'productName'), (item->>'quantityValue')::numeric,
      upper(item->>'quantityUnit')::public."QuantityUnit",
      nullif(item->>'notes', ''), item_position, now(), now(), membership.user_id,
      membership.user_id
    );
    item_position := item_position + 1;
  end loop;

  return jsonb_build_object('id', saved_order.id, 'version', saved_order.version);
end
$$;

create or replace function public.web_complete_order(p_order_id uuid, p_version integer)
returns void
language plpgsql
security definer
set search_path = pg_catalog, app_security, public, auth, extensions
as $$
declare
  membership public.web_membership_context;
begin
  membership := public.web_require_membership();

  update public.orders
  set
    completed_at = now(),
    completed_by = membership.user_id,
    updated_at = now(),
    updated_by = membership.user_id,
    version = version + 1
  where id = p_order_id
    and tenant_id = membership.tenant_id
    and deleted_at is null
    and completed_at is null
    and version = p_version;

  if not found then
    raise exception 'A encomenda não foi encontrada, foi alterada ou já foi concluída.'
      using errcode = '40001';
  end if;
end
$$;

create or replace function public.purge_completed_orders()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, app_security, public, auth, extensions
as $$
declare
  removed_orders integer;
  retention_cutoff timestamptz := now() - interval '7 days';
begin
  delete from public.order_items item
  using public.orders order_row
  where item.order_id = order_row.id
    and item.tenant_id = order_row.tenant_id
    and order_row.completed_at < retention_cutoff;

  delete from public.orders
  where completed_at < retention_cutoff;

  get diagnostics removed_orders = row_count;
  return removed_orders;
end
$$;

revoke all on function public.web_complete_order(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.web_complete_order(uuid, integer) to authenticated;

revoke all on function public.purge_completed_orders()
  from public, anon, authenticated;

revoke all on function public.web_preview_bulk_delete_orders(date, date)
  from public, anon, authenticated;
revoke all on function public.web_confirm_bulk_delete_orders(date, date)
  from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'order-manager-purge-completed-orders'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'order-manager-purge-completed-orders',
    '15 3 * * *',
    'select public.purge_completed_orders();'
  );
end
$$;

commit;
