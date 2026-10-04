-- DO NOT RUN WITHOUT THE SEPARATE, EXACT BATCH APPROVAL AND RECOVERABLE BACKUP.
-- Fill the approved tenant, IDs and count below after running historical_preview.
-- This script starts with a deliberate exception until all placeholders are set.
begin;
do $$
declare
  approved_tenant uuid := null;
  approved_ids uuid[] := array[]::uuid[];
  approved_count integer := -1;
  matched_count integer;
begin
  if approved_tenant is null or coalesce(array_length(approved_ids, 1), 0) = 0
    or approved_count < 1 or approved_count <> array_length(approved_ids, 1) then
    raise exception 'Preencha o tenant, os IDs e a contagem aprovados antes de executar.';
  end if;
  perform 1 from public.orders
  where tenant_id = approved_tenant and id = any(approved_ids)
    and ((deleted_at is not null and completed_at is null)
      or (completed_at is not null and deleted_at is null))
  for update;
  get diagnostics matched_count = row_count;
  if matched_count <> approved_count then
    raise exception 'O lote mudou desde a aprovação; nenhuma encomenda foi removida.';
  end if;
  delete from public.order_items
    where tenant_id = approved_tenant and order_id = any(approved_ids);
  delete from public.orders
    where tenant_id = approved_tenant and id = any(approved_ids)
      and ((deleted_at is not null and completed_at is null)
        or (completed_at is not null and deleted_at is null));
  get diagnostics matched_count = row_count;
  if matched_count <> approved_count then
    raise exception 'A contagem final divergiu; a transação será revertida.';
  end if;
end
$$;
commit;
