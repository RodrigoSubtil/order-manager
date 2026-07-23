-- Etapa 20: inventário somente de leitura do schema legado inferido.
--
-- Execute apenas por um operador autorizado no projeto Supabase de origem.
-- O resultado é a propriedade "schema" do contrato JSON de migração.
-- Nenhuma função, policy, trigger, tabela ou dado é alterado.

WITH legacy_tables(table_name) AS (
  VALUES
    ('app_users'),
    ('orders'),
    ('order_products'),
    ('order_responsibles'),
    ('catalog_products')
),
table_inventory AS (
  SELECT
    target.table_name,
    jsonb_build_object(
      'name', target.table_name,
      'columns', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', column_name,
            'dataType', data_type,
            'nullable', is_nullable = 'YES'
          )
          ORDER BY ordinal_position
        )
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target.table_name
      ), '[]'::jsonb),
      'primaryKey', COALESCE((
        SELECT jsonb_agg(attribute.attname ORDER BY key_position.ordinality)
        FROM pg_constraint constraint_definition
        JOIN pg_class relation ON relation.oid = constraint_definition.conrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        CROSS JOIN LATERAL unnest(constraint_definition.conkey)
          WITH ORDINALITY AS key_position(attribute_number, ordinality)
        JOIN pg_attribute attribute
          ON attribute.attrelid = relation.oid
         AND attribute.attnum = key_position.attribute_number
        WHERE namespace.nspname = 'public'
          AND relation.relname = target.table_name
          AND constraint_definition.contype = 'p'
      ), '[]'::jsonb),
      'foreignKeys', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'columns', source_columns.columns,
            'referencedTable', referenced_relation.relname,
            'referencedColumns', target_columns.columns
          )
          ORDER BY constraint_definition.conname
        )
        FROM pg_constraint constraint_definition
        JOIN pg_class source_relation ON source_relation.oid = constraint_definition.conrelid
        JOIN pg_namespace namespace ON namespace.oid = source_relation.relnamespace
        JOIN pg_class referenced_relation ON referenced_relation.oid = constraint_definition.confrelid
        CROSS JOIN LATERAL (
          SELECT jsonb_agg(attribute.attname ORDER BY key_position.ordinality) AS columns
          FROM unnest(constraint_definition.conkey)
            WITH ORDINALITY AS key_position(attribute_number, ordinality)
          JOIN pg_attribute attribute
            ON attribute.attrelid = source_relation.oid
           AND attribute.attnum = key_position.attribute_number
        ) source_columns
        CROSS JOIN LATERAL (
          SELECT jsonb_agg(attribute.attname ORDER BY key_position.ordinality) AS columns
          FROM unnest(constraint_definition.confkey)
            WITH ORDINALITY AS key_position(attribute_number, ordinality)
          JOIN pg_attribute attribute
            ON attribute.attrelid = referenced_relation.oid
           AND attribute.attnum = key_position.attribute_number
        ) target_columns
        WHERE namespace.nspname = 'public'
          AND source_relation.relname = target.table_name
          AND constraint_definition.contype = 'f'
      ), '[]'::jsonb),
      'indexes', COALESCE((
        SELECT jsonb_agg(indexname || ': ' || indexdef ORDER BY indexname)
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = target.table_name
      ), '[]'::jsonb),
      'constraints', COALESCE((
        SELECT jsonb_agg(
          constraint_definition.conname || ': ' ||
          pg_get_constraintdef(constraint_definition.oid, true)
          ORDER BY constraint_definition.conname
        )
        FROM pg_constraint constraint_definition
        JOIN pg_class relation ON relation.oid = constraint_definition.conrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = target.table_name
      ), '[]'::jsonb),
      'rlsEnabled', COALESCE((
        SELECT relation.relrowsecurity
        FROM pg_class relation
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = target.table_name
      ), false)
    ) AS definition
  FROM legacy_tables target
),
rpc_inventory AS (
  SELECT jsonb_build_object(
    'name', procedure.proname,
    'arguments', ARRAY[pg_get_function_identity_arguments(procedure.oid)],
    'securityMode', CASE
      WHEN procedure.prosecdef THEN 'DEFINER'
      ELSE 'INVOKER'
    END,
    'definitionHash', md5(pg_get_functiondef(procedure.oid))
  ) AS definition
  FROM pg_proc procedure
  JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN ('login_app_user', 'list_order_responsibles')
),
trigger_inventory AS (
  SELECT jsonb_build_object(
    'name', trigger_definition.tgname,
    'table', relation.relname,
    'definition', pg_get_triggerdef(trigger_definition.oid, true)
  ) AS definition
  FROM pg_trigger trigger_definition
  JOIN pg_class relation ON relation.oid = trigger_definition.tgrelid
  JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND NOT trigger_definition.tgisinternal
    AND relation.relname IN (SELECT table_name FROM legacy_tables)
),
policy_inventory AS (
  SELECT jsonb_build_object(
    'name', policyname,
    'table', tablename,
    'command', cmd,
    'roles', roles,
    'using', qual,
    'check', with_check
  ) AS definition
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (SELECT table_name FROM legacy_tables)
)
SELECT jsonb_pretty(jsonb_build_object(
  'tables', (SELECT jsonb_agg(definition ORDER BY table_name) FROM table_inventory),
  'rpcs', COALESCE((SELECT jsonb_agg(definition) FROM rpc_inventory), '[]'::jsonb),
  'triggers', COALESCE((SELECT jsonb_agg(definition) FROM trigger_inventory), '[]'::jsonb),
  'policies', COALESCE((SELECT jsonb_agg(definition) FROM policy_inventory), '[]'::jsonb)
)) AS schema_inventory;
