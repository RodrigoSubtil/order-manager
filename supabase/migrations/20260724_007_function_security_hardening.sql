-- Order Manager: harden every application-owned function already present in
-- the target Supabase database. This migration changes privileges and function
-- configuration only; it does not alter business data.

begin;

do $$
declare
  target_function record;
  qualified_signature text;
begin
  for target_function in
    select
      namespace.nspname as schema_name,
      procedure.proname as function_name,
      pg_get_function_identity_arguments(procedure.oid) as identity_arguments
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'app_security')
      and procedure.prokind = 'f'
  loop
    qualified_signature := format(
      '%I.%I(%s)',
      target_function.schema_name,
      target_function.function_name,
      target_function.identity_arguments
    );

    -- A fixed search_path prevents a caller-controlled object from shadowing a
    -- table, type or helper referenced by a SECURITY DEFINER function.
    execute format(
      'alter function %s set search_path = pg_catalog, app_security, public, auth, extensions',
      qualified_signature
    );

    -- PostgreSQL grants EXECUTE to PUBLIC by default. Remove that implicit
    -- access from every application function, including legacy helpers.
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      qualified_signature
    );

    -- Only the browser-facing RPC allowlist remains callable by a signed-in
    -- user. Internal web_* helpers stay private even though their names share
    -- the same prefix. Every exposed RPC validates membership, role and tenant.
    if target_function.schema_name = 'public'
      and target_function.function_name = any (array[
        'web_session_context',
        'web_management_status',
        'web_initialize_management_password',
        'web_unlock_management',
        'web_lock_management',
        'web_export_tenant_backup',
        'web_list_orders',
        'web_list_catalog_products',
        'web_list_responsibles',
        'web_save_order',
        'web_delete_order',
        'web_preview_bulk_delete_orders',
        'web_confirm_bulk_delete_orders',
        'web_save_catalog_product',
        'web_delete_catalog_product',
        'web_save_responsible',
        'web_delete_responsible'
      ])
    then
      execute format(
        'grant execute on function %s to authenticated',
        qualified_signature
      );
    end if;
  end loop;
end
$$;

commit;
