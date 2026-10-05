-- Only individually verified duplicate non-unique indexes are removed.
-- FK indexes preserve all data, constraints and access privileges.
SET LOCAL lock_timeout = '5s';
DO $index_cleanup$
DECLARE pair record; old_index oid; kept_index oid;
BEGIN
 FOR pair IN SELECT * FROM (VALUES
 ('catalog_products_tenant_category_name_idx','catalog_products_tenant_id_category_position_name_idx'),
 ('order_items_tenant_order_position_idx','order_items_tenant_id_order_id_position_idx'),
 ('orders_tenant_delivery_idx','orders_tenant_id_delivery_date_delivery_time_idx'),
 ('responsibles_tenant_position_name_idx','responsibles_tenant_id_position_name_idx'),
 ('tenant_memberships_user_status_idx','tenant_memberships_user_id_status_idx')
 ) AS pairs(old_name,kept_name)
 LOOP
  old_index:=to_regclass('public.'||pair.old_name);
  kept_index:=to_regclass('public.'||pair.kept_name);
  IF old_index IS NULL THEN CONTINUE; END IF;
  IF kept_index IS NULL OR
    regexp_replace(pg_get_indexdef(old_index),'^CREATE INDEX [^ ]+ ','CREATE INDEX ') <>
    regexp_replace(pg_get_indexdef(kept_index),'^CREATE INDEX [^ ]+ ','CREATE INDEX ') OR
    EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=old_index AND (indisunique OR NOT indisvalid)) OR
    EXISTS(SELECT 1 FROM pg_constraint WHERE conindid=old_index)
  THEN RAISE EXCEPTION 'Index % is not the expected redundant non-unique index',pair.old_name; END IF;
  EXECUTE format('DROP INDEX public.%I',pair.old_name);
 END LOOP;
END $index_cleanup$;
CREATE INDEX IF NOT EXISTS customers_created_by_idx ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS customers_updated_by_idx ON public.customers(updated_by);
CREATE INDEX IF NOT EXISTS order_items_tenant_catalog_product_idx ON public.order_items(tenant_id,catalog_product_id);
CREATE INDEX IF NOT EXISTS orders_completed_by_idx ON public.orders(completed_by);
CREATE INDEX IF NOT EXISTS orders_tenant_customer_idx ON public.orders(tenant_id,customer_id);
CREATE INDEX IF NOT EXISTS orders_tenant_responsible_idx ON public.orders(tenant_id,responsible_id);
CREATE INDEX IF NOT EXISTS tenant_management_credentials_updated_by_idx ON public.tenant_management_credentials(updated_by);
CREATE INDEX IF NOT EXISTS tenant_management_sessions_user_idx ON public.tenant_management_sessions(user_id);
