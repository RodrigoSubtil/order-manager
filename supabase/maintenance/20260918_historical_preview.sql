-- READ ONLY. Run against the intended Supabase project before proposing any
-- retroactive deletion. Record project ID, backup/restore point and output.
-- Run per tenant; the query intentionally reports, but never deletes, ambiguous
-- rows with both lifecycle markers.
select
  tenant_id,
  case
    when deleted_at is not null and completed_at is not null then 'ambiguous_both'
    when deleted_at is not null then 'deleted_only'
    when completed_at is not null then 'completed_only'
    else 'active'
  end as state,
  count(*) as orders,
  coalesce(sum((select count(*) from public.order_items item
    where item.tenant_id = order_row.tenant_id and item.order_id = order_row.id)), 0) as items,
  min(created_at) as oldest_created_at,
  max(created_at) as newest_created_at
from public.orders order_row
group by tenant_id, state
order by tenant_id, state;

-- Exact candidate IDs for the separately approved batch. Excludes active and
-- ambiguous rows. Keep this output with the approval and recovery evidence.
select tenant_id, id, order_number, version, deleted_at, completed_at,
  (select count(*) from public.order_items item
    where item.tenant_id = order_row.tenant_id and item.order_id = order_row.id) as item_count
from public.orders order_row
where (deleted_at is not null and completed_at is null)
   or (completed_at is not null and deleted_at is null)
order by tenant_id, order_number;
