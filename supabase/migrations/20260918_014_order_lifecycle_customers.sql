-- Physical order lifecycle, reusable customers, catalog identity and delivery window.
-- Apply before publishing the matching frontend. Historical soft-deleted/completed
-- orders are deliberately left untouched; see supabase/maintenance/.
begin;

create or replace function public.web_normalize_label(p_value text)
returns text language sql immutable strict parallel safe
set search_path = pg_catalog, pg_temp
as $$ select lower(regexp_replace(btrim(p_value), '[[:space:]]+', ' ', 'g')) $$;

create or replace function public.web_normalize_phone(p_value text)
returns text language sql immutable strict parallel safe
set search_path = pg_catalog, pg_temp
as $$ select regexp_replace(p_value, '[^0-9]', '', 'g') $$;

-- The unique key covers active and inactive rows: an operational order may not
-- recreate a product that a manager deliberately disabled or deleted.
do $$
declare duplicate_count integer;
begin
  select count(*) into duplicate_count from (
    select 1 from public.catalog_products
    group by tenant_id, category, public.web_normalize_label(name)
    having count(*) > 1
  ) duplicates;
  if duplicate_count > 0 then
    raise exception 'Existem % identidades duplicadas no catálogo. Resolva-as antes desta migration.', duplicate_count
      using errcode = '23505';
  end if;
end
$$;

create unique index catalog_products_tenant_category_normalized_name_uq
  on public.catalog_products (tenant_id, category, public.web_normalize_label(name));

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(btrim(name)) between 2 and 160),
  phone text not null check (phone ~ '^[0-9]{9,15}$'),
  version integer not null default 1 check (version > 0),
  normalized_name text generated always as (public.web_normalize_label(name)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  constraint customers_tenant_id_id_unique unique (tenant_id, id),
  constraint customers_tenant_identity_unique unique (tenant_id, normalized_name, phone)
);

create index customers_tenant_name_prefix_idx
  on public.customers (tenant_id, normalized_name text_pattern_ops);
alter table public.customers enable row level security;
revoke all on table public.customers from public, anon, authenticated;

alter table public.orders
  add column customer_id uuid,
  add constraint orders_customer_tenant_fk
    foreign key (tenant_id, customer_id)
    references public.customers (tenant_id, id) on delete restrict;

-- A receipt stores only mutation metadata, never a copy of an order. It keeps
-- retries safe even when the first database response was lost in transit.
create table public.order_save_receipts (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  request_id uuid not null,
  order_id uuid not null,
  order_version integer not null,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, request_id)
);
alter table public.order_save_receipts enable row level security;
revoke all on table public.order_save_receipts from public, anon, authenticated;

create or replace function public.validate_order_delivery_not_past()
returns trigger language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare local_now timestamp := timezone('Europe/Lisbon', clock_timestamp());
begin
  -- Editing the non-schedule fields of a legacy order is allowed.
  if tg_op = 'UPDATE' then
    if new.delivery_date is not distinct from old.delivery_date
      and new.delivery_time is not distinct from old.delivery_time then
      return new;
    end if;
  end if;
  if new.delivery_time < time '08:00' or new.delivery_time > time '21:00'
    or extract(second from new.delivery_time) <> 0 then
    raise exception 'A entrega deve ser agendada entre 08:00 e 21:00, em minutos inteiros.'
      using errcode = '23514';
  end if;
  if new.delivery_date < local_now::date
    or (new.delivery_date = local_now::date
      and new.delivery_time < date_trunc('minute', local_now)::time) then
    raise exception 'A data e a hora de entrega não podem ser anteriores ao momento atual.'
      using errcode = '23514';
  end if;
  return new;
end
$$;

create or replace function public.web_search_customers(p_query text)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
  with membership as (select * from public.web_require_membership()),
  term as (select public.web_normalize_label(coalesce(p_query, '')) as value)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', found.id, 'name', found.name, 'phone', found.phone, 'version', found.version
  ) order by found.name, found.phone), '[]'::jsonb)
  from (
    select customer.id, customer.name, customer.phone, customer.version
    from public.customers customer, membership, term
    where customer.tenant_id = membership.tenant_id
      and length(term.value) between 2 and 160
      and term.value !~ '[%_]'
      and customer.normalized_name like term.value || '%'
    order by customer.normalized_name, customer.phone
    limit 10
  ) found
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
          'customerId', order_row.customer_id,
          'customerVersion', (select customer.version from public.customers customer
            where customer.tenant_id = order_row.tenant_id and customer.id = order_row.customer_id),
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
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, auth, extensions, pg_temp
as $$
declare
  membership public.web_membership_context;
  saved_order public.orders;
  chosen_customer public.customers;
  catalog_row public.catalog_products;
  item jsonb;
  item_position integer := 0;
  requested_id uuid := nullif(p_order->>'id', '')::uuid;
  requested_version integer := nullif(p_order->>'version', '')::integer;
  requested_customer_id uuid := nullif(p_order->>'customerId', '')::uuid;
  requested_customer_version integer := nullif(p_order->>'customerVersion', '')::integer;
  -- The deployed frontend predates requestId. Keep its saves working until the
  -- matching frontend is published; new clients provide a stable retry key.
  requested_request_id uuid := coalesce(nullif(p_order->>'requestId', '')::uuid, gen_random_uuid());
  request_hash text := md5(p_order::text);
  previous_receipt public.order_save_receipts;
  clean_name text := regexp_replace(btrim(coalesce(p_order->>'clientName', '')), '[[:space:]]+', ' ', 'g');
  clean_phone text := public.web_normalize_phone(coalesce(p_order->>'phone', ''));
  requested_delivery_date date := nullif(p_order->>'deliveryDate', '')::date;
  requested_delivery_time time := nullif(p_order->>'deliveryTime', '')::time;
  requested_responsible_id uuid := nullif(p_order->>'responsibleId', '')::uuid;
  item_category public."ProductCategory";
  item_name text;
  item_quantity numeric;
  item_unit public."QuantityUnit";
  original_order_name text;
  original_order_phone text;
  original_order_customer_id uuid;
begin
  membership := public.web_require_membership();
  -- Serialize requests sharing a retry key before any data or number changes.
  perform pg_advisory_xact_lock(hashtextextended(membership.tenant_id::text || ':' || requested_request_id::text, 0));
  select * into previous_receipt from public.order_save_receipts receipt
    where receipt.tenant_id = membership.tenant_id and receipt.request_id = requested_request_id;
  if found then
    if previous_receipt.payload_hash <> request_hash then
      raise exception 'Esta tentativa de gravação foi alterada. Reabra a encomenda.' using errcode = '40001';
    end if;
    if not exists (select 1 from public.orders
      where tenant_id = membership.tenant_id and id = previous_receipt.order_id
        and version = previous_receipt.order_version and deleted_at is null and completed_at is null) then
      raise exception 'A encomenda mudou depois desta gravação. Recarregue os dados.' using errcode = '40001';
    end if;
    return jsonb_build_object('id', previous_receipt.order_id, 'version', previous_receipt.order_version);
  end if;
  if length(clean_name) not between 2 and 160 or clean_phone !~ '^[0-9]{9,15}$' then
    raise exception 'Indique nome e telefone válidos para o cliente.' using errcode = '23514';
  end if;
  if requested_delivery_date is null or requested_delivery_time is null then
    raise exception 'Indique a data e a hora de entrega.' using errcode = '23514';
  end if;
  if coalesce(p_order->>'deliveryDate', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_order->>'deliveryTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Use data AAAA-MM-DD e hora HH:mm para a entrega.' using errcode = '23514';
  end if;
  if requested_responsible_id is null or not exists (
    select 1 from public.responsibles where tenant_id = membership.tenant_id
      and id = requested_responsible_id and is_active and deleted_at is null
  ) then
    raise exception 'Escolha um responsável ativo da sua empresa.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_order->'items') is distinct from 'array' then
    raise exception 'Adicione entre 1 e 100 produtos.' using errcode = '23514';
  end if;
  if jsonb_array_length(p_order->'items') not between 1 and 100 then
    raise exception 'Adicione entre 1 e 100 produtos.' using errcode = '23514';
  end if;

  if requested_id is null then
    update public.tenants set next_order_number = next_order_number + 1,
      updated_at = now(), updated_by = membership.user_id
    where id = membership.tenant_id
    returning next_order_number - 1 into saved_order.order_number;
    insert into public.orders (
      tenant_id, order_number, client_name, phone, responsible_id, delivery_date,
      delivery_time, version, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.order_number, clean_name, clean_phone,
      requested_responsible_id, requested_delivery_date, requested_delivery_time,
      1, membership.user_id, membership.user_id
    ) returning * into saved_order;
  else
    select client_name, phone, customer_id
      into original_order_name, original_order_phone, original_order_customer_id
      from public.orders where id = requested_id and tenant_id = membership.tenant_id
        and deleted_at is null and completed_at is null and version = requested_version
      for update;
    if not found then
      raise exception 'A encomenda foi alterada ou concluída por outro utilizador.' using errcode = '40001';
    end if;
    update public.orders set
      client_name = clean_name, phone = clean_phone,
      responsible_id = requested_responsible_id,
      delivery_date = requested_delivery_date, delivery_time = requested_delivery_time,
      version = version + 1, updated_at = now(), updated_by = membership.user_id
    where id = requested_id and tenant_id = membership.tenant_id
      and deleted_at is null and completed_at is null and version = requested_version
    returning * into saved_order;
    if saved_order.id is null then
      raise exception 'A encomenda foi alterada ou concluída por outro utilizador.' using errcode = '40001';
    end if;
    -- No hidden item history remains after an edit.
    delete from public.order_items where tenant_id = membership.tenant_id and order_id = saved_order.id;
  end if;

  if requested_customer_id is not null then
    select * into chosen_customer from public.customers
      where tenant_id = membership.tenant_id and id = requested_customer_id for update;
    if chosen_customer.id is null then
      raise exception 'O cliente selecionado não pertence a esta empresa.' using errcode = '23514';
    end if;
    if coalesce((p_order->>'updateCustomer')::boolean, false) then
      if chosen_customer.version is distinct from requested_customer_version then
        raise exception 'Este cliente foi alterado por outro utilizador. Reabra a encomenda.'
          using errcode = '40001';
      end if;
      if exists (select 1 from public.customers
        where tenant_id = membership.tenant_id and id <> requested_customer_id
          and normalized_name = public.web_normalize_label(clean_name) and phone = clean_phone) then
        raise exception 'Já existe outro cliente com este nome e telefone. Selecione-o ou use Trocar cliente.'
          using errcode = '23505';
      end if;
      begin
        update public.customers set name = clean_name, phone = clean_phone,
          version = version + 1, updated_at = now(), updated_by = membership.user_id
        where tenant_id = membership.tenant_id and id = requested_customer_id
        returning * into chosen_customer;
      exception when unique_violation then
        raise exception 'Já existe outro cliente com este nome e telefone. Selecione-o ou use Trocar cliente.'
          using errcode = '23505';
      end;
    elsif (public.web_normalize_label(chosen_customer.name) <> public.web_normalize_label(clean_name)
      or chosen_customer.phone <> clean_phone)
      and not (requested_id is not null
        and coalesce(original_order_customer_id = requested_customer_id, false)
        and public.web_normalize_label(original_order_name) = public.web_normalize_label(clean_name)
        and original_order_phone = clean_phone) then
      raise exception 'Os dados deste cliente mudaram. Selecione-o novamente antes de guardar.'
        using errcode = '40001';
    end if;
  else
    insert into public.customers (tenant_id, name, phone, created_by, updated_by)
    values (membership.tenant_id, clean_name, clean_phone, membership.user_id, membership.user_id)
    on conflict (tenant_id, normalized_name, phone) do nothing
    returning * into chosen_customer;
    if chosen_customer.id is null then
      select * into chosen_customer from public.customers
      where tenant_id = membership.tenant_id
        and normalized_name = public.web_normalize_label(clean_name) and phone = clean_phone;
    end if;
  end if;
  update public.orders set customer_id = chosen_customer.id
    where tenant_id = membership.tenant_id and id = saved_order.id;

  for item in select * from jsonb_array_elements(p_order->'items') loop
    item_name := regexp_replace(btrim(coalesce(item->>'productName', '')), '[[:space:]]+', ' ', 'g');
    if length(item_name) not between 1 and 160 then
      raise exception 'Indique um nome de produto com até 160 caracteres.' using errcode = '23514';
    end if;
    item_category := upper(item->>'category')::public."ProductCategory";
    item_quantity := (item->>'quantityValue')::numeric;
    item_unit := upper(item->>'quantityUnit')::public."QuantityUnit";
    if item_quantity is null or item_quantity < 1 or item_quantity > 1000
      or length(coalesce(item->>'notes', '')) > 1000 then
      raise exception 'Quantidade ou observação inválida.' using errcode = '23514';
    end if;
    insert into public.catalog_products (
      tenant_id, category, name, created_by, updated_by
    ) values (membership.tenant_id, item_category, item_name, membership.user_id, membership.user_id)
    on conflict do nothing returning * into catalog_row;
    if catalog_row.id is null then
      select * into catalog_row from public.catalog_products
      where tenant_id = membership.tenant_id and category = item_category
        and public.web_normalize_label(name) = public.web_normalize_label(item_name);
      if catalog_row.id is null or not catalog_row.is_active or catalog_row.deleted_at is not null then
        raise exception 'O produto "%" está desativado no catálogo. Contacte o gestor.', item_name
          using errcode = '23514';
      end if;
    end if;
    catalog_row := null;
    insert into public.order_items (
      tenant_id, order_id, category, product_name, quantity_value, quantity_unit,
      notes, position, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.id, item_category, item_name,
      item_quantity, item_unit, nullif(item->>'notes', ''), item_position,
      membership.user_id, membership.user_id
    );
    item_position := item_position + 1;
  end loop;

  insert into public.order_save_receipts (tenant_id, request_id, order_id, order_version, payload_hash)
  values (membership.tenant_id, requested_request_id, saved_order.id, saved_order.version, request_hash);
  return jsonb_build_object('id', saved_order.id, 'version', saved_order.version);
end
$$;

create or replace function public.web_remove_order(p_order_id uuid, p_version integer)
returns void language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare membership public.web_membership_context;
begin
  membership := public.web_require_membership();
  perform 1 from public.orders
    where id = p_order_id and tenant_id = membership.tenant_id
      and version = p_version and deleted_at is null and completed_at is null
    for update;
  if not found then
    raise exception 'A encomenda não foi encontrada ou foi alterada por outro utilizador.' using errcode = '40001';
  end if;
  delete from public.order_items where tenant_id = membership.tenant_id and order_id = p_order_id;
  delete from public.orders where tenant_id = membership.tenant_id and id = p_order_id and version = p_version;
  if not found then
    raise exception 'A encomenda foi alterada por outro utilizador.' using errcode = '40001';
  end if;
end
$$;

create or replace function public.web_delete_order(p_order_id uuid, p_version integer)
returns void language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$ begin perform public.web_remove_order(p_order_id, p_version); end $$;

create or replace function public.web_complete_order(p_order_id uuid, p_version integer)
returns void language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$ begin perform public.web_remove_order(p_order_id, p_version); end $$;

-- The old date-range bulk RPC was not used by the frontend and cannot enforce
-- per-order versions. Withdraw it instead of leaving a soft-delete back door.
revoke all on function public.web_confirm_bulk_delete_orders(date, date) from public, anon, authenticated;
drop function public.web_confirm_bulk_delete_orders(date, date);
revoke all on function public.web_preview_bulk_delete_orders(date, date) from public, anon, authenticated;
drop function public.web_preview_bulk_delete_orders(date, date);

do $$
declare existing_job_id bigint;
begin
  if to_regclass('cron.job') is not null then
    for existing_job_id in select jobid from cron.job
      where jobname = 'order-manager-purge-completed-orders' loop
      perform cron.unschedule(existing_job_id);
    end loop;
  end if;
end
$$;
drop function if exists public.purge_completed_orders();

revoke all on function public.web_normalize_label(text), public.web_normalize_phone(text),
  public.web_remove_order(uuid, integer), public.web_search_customers(text),
  public.web_save_order(jsonb), public.web_delete_order(uuid, integer),
  public.web_complete_order(uuid, integer), public.validate_order_delivery_not_past()
  from public, anon, authenticated;
grant execute on function public.web_search_customers(text), public.web_save_order(jsonb),
  public.web_delete_order(uuid, integer), public.web_complete_order(uuid, integer)
  to authenticated;

commit;
