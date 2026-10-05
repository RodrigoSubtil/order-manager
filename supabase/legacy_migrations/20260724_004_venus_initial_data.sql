-- Pastelaria Vénus: clean initial business data.
--
-- This project contained only synthetic demonstration data. This migration
-- removes that demo data, keeps the deterministic tenant id, resets order
-- numbering, and installs the approved real company name, responsibles and
-- catalog. It is safe to replay before real orders are entered.

begin;

insert into public.tenants (
  id,
  slug,
  name,
  status,
  next_order_number,
  created_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  'pastelaria-venus',
  'Pastelaria Venus - Boutique de Pão, Lda',
  'ACTIVE',
  1,
  now(),
  now()
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  status = 'ACTIVE',
  next_order_number = 1,
  updated_at = now();

-- All existing records in this tenant were explicitly classified as fictitious.
delete from public.order_items
where tenant_id = '11111111-1111-4111-8111-111111111111';

delete from public.orders
where tenant_id = '11111111-1111-4111-8111-111111111111';

delete from public.catalog_products
where tenant_id = '11111111-1111-4111-8111-111111111111';

delete from public.responsibles
where tenant_id = '11111111-1111-4111-8111-111111111111';

insert into public.responsibles (
  id,
  tenant_id,
  name,
  is_active,
  position,
  version,
  created_at,
  updated_at
)
values
  ('20000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Adriana', true, 1, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'David', true, 2, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Luis', true, 3, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Lurdes', true, 4, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Manoel', true, 5, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Maria Helena', true, 6, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'Maria Manoela', true, 7, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'Nadia', true, 8, 1, now(), now()),
  ('20000000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'Sidney', true, 9, 1, now(), now());

insert into public.catalog_products (
  id,
  tenant_id,
  category,
  name,
  default_unit,
  is_active,
  position,
  version,
  created_at,
  updated_at
)
values
  -- Padaria
  ('21000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Baguete', 'UN', true, 1, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Bola de Mistura', 'UN', true, 2, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Broa de Milho', 'UN', true, 3, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Cacete', 'UN', true, 4, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Carcaça', 'UN', true, 5, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão com Chouriço', 'UN', true, 6, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão de Água', 'UN', true, 7, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão de Cereais', 'UN', true, 8, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão de Centeio', 'UN', true, 9, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão de Forma', 'UN', true, 10, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão de Leite', 'UN', true, 11, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão de Mistura', 'UN', true, 12, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão de Trigo', 'UN', true, 13, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000014', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Pão Integral', 'UN', true, 14, 1, now(), now()),
  ('21000000-0000-4000-8000-000000000015', '11111111-1111-4111-8111-111111111111', 'PADARIA', 'Regueifa', 'UN', true, 15, 1, now(), now()),

  -- Pastelaria
  ('22000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Bola de Berlim', 'UN', true, 1, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Croissant de Chocolate', 'UN', true, 2, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Croissant Misto', 'UN', true, 3, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Croissant Simples', 'UN', true, 4, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Éclair de Chocolate', 'UN', true, 5, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Fatia de Bolo de Chocolate', 'UN', true, 6, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Jesuíta', 'UN', true, 7, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Mil-folhas', 'UN', true, 8, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Muffin de Chocolate', 'UN', true, 9, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Napolitana de Chocolate', 'UN', true, 10, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Palmier', 'UN', true, 11, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Pão de Deus', 'UN', true, 12, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Pastel de Nata', 'UN', true, 13, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000014', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Queque', 'UN', true, 14, 1, now(), now()),
  ('22000000-0000-4000-8000-000000000015', '11111111-1111-4111-8111-111111111111', 'PASTELARIA', 'Tarte de Maçã', 'UN', true, 15, 1, now(), now()),

  -- Salgados
  ('23000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Chamuça de Carne', 'UN', true, 1, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Coxinha de Frango', 'UN', true, 2, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Croquete de Carne', 'UN', true, 3, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Empada de Galinha', 'UN', true, 4, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Enrolado de Queijo e Fiambre', 'UN', true, 5, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Folhado de Salsicha', 'UN', true, 6, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Folhado Misto', 'UN', true, 7, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Lanche Misto', 'UN', true, 8, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Merenda Mista', 'UN', true, 9, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Pão de Queijo', 'UN', true, 10, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Pastel de Bacalhau', 'UN', true, 11, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Quiche de Fiambre e Queijo', 'UN', true, 12, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Quiche de Legumes', 'UN', true, 13, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000014', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Rissol de Camarão', 'UN', true, 14, 1, now(), now()),
  ('23000000-0000-4000-8000-000000000015', '11111111-1111-4111-8111-111111111111', 'SALGADOS', 'Rissol de Carne', 'UN', true, 15, 1, now(), now());

create unique index if not exists responsibles_tenant_active_name_unique
  on public.responsibles (tenant_id, lower(name))
  where deleted_at is null;

create unique index if not exists catalog_products_tenant_active_name_unique
  on public.catalog_products (tenant_id, category, lower(name))
  where deleted_at is null;

do $validation$
declare
  responsible_count integer;
  catalog_count integer;
  order_count integer;
begin
  select count(*) into responsible_count
  from public.responsibles
  where tenant_id = '11111111-1111-4111-8111-111111111111'
    and deleted_at is null;

  select count(*) into catalog_count
  from public.catalog_products
  where tenant_id = '11111111-1111-4111-8111-111111111111'
    and deleted_at is null;

  select count(*) into order_count
  from public.orders
  where tenant_id = '11111111-1111-4111-8111-111111111111';

  if responsible_count <> 9 or catalog_count <> 45 or order_count <> 0 then
    raise exception
      'initial data validation failed: responsibles %, catalog %, orders %',
      responsible_count,
      catalog_count,
      order_count;
  end if;

  if exists (
    select 1
    from (
      select category, count(*) as total
      from public.catalog_products
      where tenant_id = '11111111-1111-4111-8111-111111111111'
        and deleted_at is null
      group by category
    ) category_count
    where category_count.total <> 15
  ) then
    raise exception 'each catalog category must contain exactly 15 products';
  end if;
end
$validation$;

commit;
