-- PostgreSQL integration test. Run only on an isolated Supabase project after
-- all migrations, with a dedicated active Auth user without a default company.
-- Set order_manager.test_user_id to that user's UUID in the SAME connection.
-- Example: select set_config('order_manager.test_user_id', '<test-user-uuid>', false);
-- This whole test is rolled back. Never run it on production.
begin;
do $$
declare
  test_user uuid := nullif(current_setting('order_manager.test_user_id', true), '')::uuid;
  first_tenant uuid := gen_random_uuid();
  second_tenant uuid := gen_random_uuid();
  responsible uuid := gen_random_uuid();
  delivery_date date := timezone('Europe/Lisbon', clock_timestamp())::date + 1;
  request uuid := gen_random_uuid();
  payload jsonb;
  saved jsonb;
  repeated jsonb;
  edited jsonb;
  legacy_payload jsonb;
  customer uuid;
  invalid_time text;
  count_rows integer;
  previous_number bigint;
  next_number bigint;
begin
  if test_user is null or not exists (select 1 from public.users
    where id = test_user and status = 'ACTIVE') then
    raise exception 'Configure um utilizador Auth de teste ativo antes de executar.';
  end if;
  if exists (select 1 from public.tenant_memberships
    where user_id = test_user and is_default and status = 'ACTIVE') then
    raise exception 'O utilizador de teste já tem empresa padrão; use uma conta isolada.';
  end if;
  insert into public.tenants (id, slug, name)
    values (first_tenant, 'order-test-' || first_tenant, 'Teste pedidos'),
      (second_tenant, 'order-test-' || second_tenant, 'Teste isolamento');
  insert into public.tenant_memberships (tenant_id, user_id, role, status, is_default)
    values (first_tenant, test_user, 'OPERATOR', 'ACTIVE', true),
      (second_tenant, test_user, 'OPERATOR', 'ACTIVE', false);
  insert into public.responsibles (id, tenant_id, name)
    values (responsible, first_tenant, 'Responsável teste');
  perform set_config('request.jwt.claim.sub', test_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  if has_table_privilege('authenticated', 'public.customers', 'SELECT')
    or has_table_privilege('authenticated', 'public.order_save_receipts', 'SELECT')
    or has_function_privilege('authenticated', 'public.web_remove_order(uuid,integer)', 'EXECUTE') then
    raise exception 'Uma tabela ou função interna ficou exposta ao browser.';
  end if;

  payload := jsonb_build_object(
    'requestId', request, 'clientName', 'Ana Teste', 'phone', '912 345 678',
    'responsibleId', responsible, 'deliveryDate', delivery_date,
    'deliveryTime', '08:00', 'items', jsonb_build_array(
      jsonb_build_object('category', 'PADARIA', 'productName', 'Pão Teste',
        'quantityValue', 2, 'quantityUnit', 'UN', 'notes', null)
    )
  );
  saved := public.web_save_order(payload);
  repeated := public.web_save_order(payload);
  if saved <> repeated then raise exception 'Repetição criou outra encomenda.'; end if;
  select count(*) into count_rows from public.orders where tenant_id = first_tenant;
  if count_rows <> 1 then raise exception 'A criação não foi idempotente.'; end if;
  -- Preserve compatibility with older callers that omitted requestId.
  repeated := public.web_save_order(payload - 'requestId');
  if nullif(repeated->>'id', '') is null then
    raise exception 'O frontend publicado deixou de conseguir guardar encomendas.';
  end if;
  select customer_id into customer from public.orders where id = (saved->>'id')::uuid;
  if customer is null or not exists (select 1 from public.customers
    where id = customer and tenant_id = first_tenant and phone = '351912345678') then
    raise exception 'Cliente não criado e vinculado corretamente.';
  end if;
  if jsonb_array_length(public.web_search_customers('A')) <> 1
    or public.web_search_customers('A')->0->>'phone' <> '351912345678' then
    raise exception 'Sugestão não retornou nome e telefone do cliente.';
  end if;
  select count(*) into count_rows from public.catalog_products
    where tenant_id = first_tenant and category = 'PADARIA';
  if count_rows <> 1 then raise exception 'Produto novo não foi cadastrado.'; end if;

  -- The server rejects both ends outside the allowed window.
  foreach invalid_time in array array['07:59', '21:01'] loop
    begin
      perform public.web_save_order(jsonb_set(jsonb_set(payload,
        '{requestId}', to_jsonb(gen_random_uuid()::text)),
        '{deliveryTime}', to_jsonb(invalid_time)));
      raise exception 'Hora % deveria ser rejeitada.', invalid_time;
    exception when sqlstate '23514' then null;
    end;
  end loop;
  -- The upper bound is inclusive, even when created outside business hours.
  perform public.web_save_order(jsonb_set(jsonb_set(payload,
    '{requestId}', to_jsonb(gen_random_uuid()::text)),
    '{deliveryTime}', to_jsonb('21:00'::text)));
  select count(*) into count_rows from public.customers where tenant_id = first_tenant;
  if count_rows <> 1 then raise exception 'Nome e telefone iguais duplicaram o cliente.'; end if;
  begin
    perform public.web_save_order(jsonb_set(jsonb_set(payload,
      '{requestId}', to_jsonb(gen_random_uuid()::text)),
      '{deliveryDate}', to_jsonb((delivery_date - 2)::text)));
    raise exception 'Entrega passada deveria ser rejeitada.';
  exception when sqlstate '23514' then null;
  end;

  -- Selected customer keeps its ID when corrected; existing order snapshot is
  -- updated only because this very order was edited.
  edited := payload || jsonb_build_object('id', saved->>'id',
    'version', (saved->>'version')::integer, 'requestId', gen_random_uuid(),
    'customerId', customer, 'customerVersion', 1, 'updateCustomer', true,
    'phone', '351913000000',
    'items', jsonb_build_array(jsonb_build_object(
      'category', 'PADARIA', 'productName', '  PÃO   TESTE  ',
      'quantityValue', 3, 'quantityUnit', 'KG', 'notes', null)));
  saved := public.web_save_order(edited);
  if (select phone from public.customers where id = customer) <> '351913000000' then
    raise exception 'Correção de telefone não atualizou o cliente selecionado.';
  end if;
  select count(*) into count_rows from public.order_items
    where order_id = (saved->>'id')::uuid;
  if count_rows <> 1 then raise exception 'Itens antigos permaneceram depois da edição.'; end if;
  select count(*) into count_rows from public.catalog_products
    where tenant_id = first_tenant and category = 'PADARIA';
  if count_rows <> 1 then raise exception 'Produto duplicado após mudança de caixa ou espaços.'; end if;
  repeated := public.web_save_order(jsonb_set(
    payload || jsonb_build_object('requestId', gen_random_uuid(), 'phone', '351913000000'),
    '{items}', jsonb_build_array(
      jsonb_build_object('category', 'PADARIA', 'productName', 'Pão Teste',
        'quantityValue', 1, 'quantityUnit', 'UN', 'notes', null),
      jsonb_build_object('category', 'PADARIA', 'productName', ' PÃO   TESTE ',
        'quantityValue', 2, 'quantityUnit', 'KG', 'notes', null))));
  select count(*) into count_rows from public.order_items
    where order_id = (repeated->>'id')::uuid;
  if count_rows <> 2 then raise exception 'Produtos repetidos no pedido foram perdidos.'; end if;
  select count(*) into count_rows from public.catalog_products
    where tenant_id = first_tenant and category = 'PADARIA';
  if count_rows <> 1 then raise exception 'Produto repetido no mesmo pedido duplicou catálogo.'; end if;
  begin
    perform public.web_save_order(edited || jsonb_build_object(
      'requestId', gen_random_uuid(), 'version', (saved->>'version')::integer,
      'customerVersion', 1, 'phone', '351915000000'));
    raise exception 'Versão antiga do cliente deveria ser rejeitada.';
  exception when sqlstate '40001' then null;
  end;
  if (select phone from public.customers where id = customer) <> '351913000000' then
    raise exception 'Conflito alterou o cliente antes de rejeitar o pedido.';
  end if;

  -- Homonyms and a shared phone remain separate identities.
  perform public.web_save_order(payload || jsonb_build_object(
    'requestId', gen_random_uuid(), 'phone', '351914000000'));
  perform public.web_save_order(payload || jsonb_build_object(
    'requestId', gen_random_uuid(), 'clientName', 'Bia Teste'));
  select count(*) into count_rows from public.customers where tenant_id = first_tenant;
  if count_rows <> 3 then raise exception 'Homônimos ou telefone partilhado foram unidos.'; end if;
  begin
    perform public.web_save_order(edited || jsonb_build_object(
      'requestId', gen_random_uuid(), 'version', (saved->>'version')::integer,
      'customerVersion', 2, 'phone', '351914000000'));
    raise exception 'Colisão com outro cliente deveria ser rejeitada.';
  exception when sqlstate '23505' then null;
  end;

  -- A disabled product blocks the whole transaction without adding customer.
  update public.catalog_products set is_active = false
    where tenant_id = first_tenant and category = 'PADARIA';
  begin
    perform public.web_save_order(payload || jsonb_build_object(
      'requestId', gen_random_uuid(), 'clientName', 'Cliente Rejeitado'));
    raise exception 'Produto desativado deveria bloquear a encomenda.';
  exception when sqlstate '23514' then null;
  end;
  if exists (select 1 from public.customers
    where tenant_id = first_tenant and name = 'Cliente Rejeitado') then
    raise exception 'Falha na encomenda criou cliente parcial.';
  end if;
  update public.catalog_products set is_active = true
    where tenant_id = first_tenant and category = 'PADARIA';

  -- Simulate one pre-migration overdue order inside this disposable transaction.
  -- The trigger is re-enabled before invoking the RPC under test.
  alter table public.orders disable trigger orders_delivery_not_past;
  update public.orders order_row set delivery_date = order_row.delivery_date - 3
    where order_row.tenant_id = first_tenant and order_row.id = (saved->>'id')::uuid;
  alter table public.orders enable trigger orders_delivery_not_past;
  legacy_payload := edited || jsonb_build_object(
    'requestId', gen_random_uuid(), 'version', (saved->>'version')::integer,
    'deliveryDate', delivery_date - 3, 'updateCustomer', false);
  saved := public.web_save_order(legacy_payload);
  begin
    perform public.web_save_order(legacy_payload || jsonb_build_object(
      'requestId', gen_random_uuid(), 'version', (saved->>'version')::integer,
      'deliveryDate', delivery_date - 2));
    raise exception 'Reagendamento para data passada deveria falhar.';
  exception when sqlstate '23514' then null;
  end;

  -- Switching the active company hides and protects the first tenant.
  -- Fixture changes run without an Auth subject, as migrations do. RPCs below
  -- still run with the operator's subject to exercise tenant enforcement.
  perform set_config('request.jwt.claim.sub', '', true);
  update public.tenant_memberships set is_default = false
    where tenant_id = first_tenant and user_id = test_user;
  update public.tenant_memberships set is_default = true
    where tenant_id = second_tenant and user_id = test_user;
  perform set_config('request.jwt.claim.sub', test_user::text, true);
  if public.web_search_customers('Ana') <> '[]'::jsonb then
    raise exception 'Pesquisa de clientes vazou entre empresas.';
  end if;
  begin
    perform public.web_delete_order((saved->>'id')::uuid, (saved->>'version')::integer);
    raise exception 'Exclusão por outra empresa deveria ser rejeitada.';
  exception when sqlstate '40001' then null;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  update public.tenant_memberships set is_default = false
    where tenant_id = second_tenant and user_id = test_user;
  update public.tenant_memberships set is_default = true
    where tenant_id = first_tenant and user_id = test_user;
  perform set_config('request.jwt.claim.sub', test_user::text, true);
  begin
    perform public.web_complete_order((saved->>'id')::uuid, 1);
    raise exception 'Versão antiga deveria ser rejeitada.';
  exception when sqlstate '40001' then null;
  end;

  insert into public.order_items (
    tenant_id, order_id, category, product_name, quantity_value, quantity_unit,
    position, deleted_at
  ) values (
    first_tenant, (saved->>'id')::uuid, 'PADARIA', 'Item histórico', 1, 'UN',
    99, now()
  );

  perform public.web_complete_order((saved->>'id')::uuid, (saved->>'version')::integer);
  if exists (select 1 from public.orders where id = (saved->>'id')::uuid)
    or exists (select 1 from public.order_items where order_id = (saved->>'id')::uuid) then
    raise exception 'Concluir não removeu encomenda e itens fisicamente.';
  end if;
  if not exists (select 1 from public.customers where id = customer)
    or not exists (select 1 from public.catalog_products
      where tenant_id = first_tenant and category = 'PADARIA') then
    raise exception 'A exclusão removeu cadastro reutilizável.';
  end if;
  -- Apagar uses the same physical path as Concluir.
  repeated := public.web_save_order(payload || jsonb_build_object('requestId', gen_random_uuid()));
  select order_number into previous_number from public.orders where id = (repeated->>'id')::uuid;
  perform public.web_delete_order((repeated->>'id')::uuid, (repeated->>'version')::integer);
  if exists (select 1 from public.orders where id = (repeated->>'id')::uuid)
    or exists (select 1 from public.order_items where order_id = (repeated->>'id')::uuid) then
    raise exception 'Apagar não removeu encomenda e itens fisicamente.';
  end if;
  repeated := public.web_save_order(payload || jsonb_build_object('requestId', gen_random_uuid()));
  select order_number into next_number from public.orders where id = (repeated->>'id')::uuid;
  if next_number <= previous_number then raise exception 'Número de pedido antigo foi reutilizado.'; end if;
end
$$;
rollback;
