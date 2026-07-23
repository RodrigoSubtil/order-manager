-- Etapa 20: export de dados legado somente de leitura.
--
-- Execute apenas por um operador autorizado e guarde o resultado cifrado.
-- Este export contém dados pessoais de clientes. Ele exclui deliberadamente
-- qualquer coluna de password/hash de app_users.
-- O resultado é a propriedade "data" do contrato JSON de migração.

SELECT jsonb_pretty(jsonb_build_object(
  'appUsers', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'username', username,
      'bakeryName', bakery_name
    ) ORDER BY id)
    FROM public.app_users
  ), '[]'::jsonb),
  'orders', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'orderNumber', order_number,
      'appUserId', app_user_id,
      'clientName', client_name,
      'phone', phone,
      'responsibleId', responsible_id,
      'deliveryDate', delivery_date::text,
      'deliveryTime', delivery_time::text,
      'createdAt', created_at
    ) ORDER BY id)
    FROM public.orders
  ), '[]'::jsonb),
  'orderProducts', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'orderId', order_id,
      'category', category,
      'product', product,
      'quantity', quantity,
      'notes', notes,
      'position', position
    ) ORDER BY order_id, position, id)
    FROM public.order_products
  ), '[]'::jsonb),
  'orderResponsibles', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'appUserId', app_user_id,
      'name', name,
      'isActive', is_active,
      'position', position
    ) ORDER BY position, id)
    FROM public.order_responsibles
  ), '[]'::jsonb),
  'catalogProducts', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'category', category,
      'name', name,
      'isActive', is_active,
      'position', position
    ) ORDER BY category, position, id)
    FROM public.catalog_products
  ), '[]'::jsonb)
)) AS legacy_data;
