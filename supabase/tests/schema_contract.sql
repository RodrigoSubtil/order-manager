-- Run after the canonical migrations, in an isolated database or read-only audit.
do $contract$
declare exposed integer; app_functions integer;
begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r') <> 13 then
    raise exception 'Application schema must contain the 13 canonical tables';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) then
    raise exception 'A public table has RLS disabled';
  end if;
  select count(*) into exposed from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and
    (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'));
  if exposed <> 0 then raise exception 'Browser roles have direct table access'; end if;
  select count(*) into exposed from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and has_function_privilege('anon',p.oid,'EXECUTE');
  if exposed <> 0 then raise exception 'Anon can execute application functions'; end if;
  select count(*) into app_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and has_function_privilege('authenticated',p.oid,'EXECUTE');
  if app_functions <> 17 then raise exception 'Expected 17 authenticated application RPCs, found %', app_functions; end if;
  if exists(select 1 from pg_roles where rolname='order_manager_api' and (rolcanlogin or rolbypassrls or rolsuper)) then
    raise exception 'Legacy compatibility role is privileged or can log in';
  end if;
  if to_regprocedure('public.purge_completed_orders()') is not null then
    raise exception 'Unexpected automatic order purge function';
  end if;
  if to_regclass('cron.job') is not null then
    execute 'select count(*) from cron.job where active' into exposed;
    if exposed <> 0 then raise exception 'Unexpected active cron jobs'; end if;
  end if;
end
$contract$;
