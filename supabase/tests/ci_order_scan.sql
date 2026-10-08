-- Apenas para a base descartável do CI. Nunca executar em homologação/produção.
begin;
insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-4333-8333-333333333333', 'scan-ci@users.order-manager.invalid', '{}'::jsonb);

do $test$
declare
  test_user uuid := '33333333-3333-4333-8333-333333333333';
  test_tenant uuid := gen_random_uuid();
  attempt uuid;
  number integer;
  blocked boolean;
begin
  if has_function_privilege('authenticated', 'public.web_begin_order_scan(uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.web_finish_order_scan(uuid,text,integer,integer,integer)', 'EXECUTE')
    or has_table_privilege('authenticated', 'app_security.order_scan_attempts', 'SELECT') then
    raise exception 'Os limites da digitalização ficaram expostos ao browser.';
  end if;
  if not exists (select 1 from public.users where id = test_user and status = 'ACTIVE') then
    raise exception 'O utilizador de teste não foi criado.';
  end if;

  insert into public.tenants (id, slug, name)
  values (test_tenant, 'scan-ci-' || test_tenant, 'Teste digitalização');
  insert into public.tenant_memberships (tenant_id, user_id, role, status, is_default)
  values (test_tenant, test_user, 'OPERATOR', 'ACTIVE', true);

  for number in 1..50 loop
    attempt := public.web_begin_order_scan(test_user);
    if number = 1 then
      blocked := false;
      begin
        perform public.web_begin_order_scan(test_user);
      exception when sqlstate 'P0001' then blocked := true;
      end;
      if not blocked then raise exception 'Duas análises simultâneas foram admitidas.'; end if;
    end if;
    perform public.web_finish_order_scan(attempt, 'failed', 0, null, null);
  end loop;

  blocked := false;
  begin
    perform public.web_begin_order_scan(test_user);
  exception when sqlstate 'P0001' then blocked := true;
  end;
  if not blocked then raise exception 'A análise 51 deveria ser bloqueada.'; end if;
end
$test$;
rollback;
