-- Expand the Pastelaria Venus catalog with common Portuguese bakery products.
-- The migration preserves the existing 15 products in each category and adds
-- 40 active options to Padaria, Pastelaria and Salgados.

begin;

create temporary table venus_catalog_expansion (
  category public."ProductCategory" not null,
  name text not null,
  position integer not null,
  primary key (category, name)
) on commit drop;

insert into venus_catalog_expansion (category, name, position)
values
  -- Padaria
  ('PADARIA', 'Bola de Água', 16),
  ('PADARIA', 'Bola de Centeio', 17),
  ('PADARIA', 'Padeira Bola', 18),
  ('PADARIA', 'Padeira Grande', 19),
  ('PADARIA', 'Pão Alentejano', 20),
  ('PADARIA', 'Pão Saloio', 21),
  ('PADARIA', 'Pão de Mafra', 22),
  ('PADARIA', 'Pão de Rio Maior', 23),
  ('PADARIA', 'Pão de Avintes', 24),
  ('PADARIA', 'Broa de Avintes', 25),
  ('PADARIA', 'Broa de Centeio', 26),
  ('PADARIA', 'Broa de Mistura', 27),
  ('PADARIA', 'Pão de Espelta', 28),
  ('PADARIA', 'Pão de Aveia', 29),
  ('PADARIA', 'Pão Multicereais', 30),
  ('PADARIA', 'Pão de Massa Mãe', 31),
  ('PADARIA', 'Pão de Trigo de Massa Mãe', 32),
  ('PADARIA', 'Pão de Centeio de Massa Mãe', 33),
  ('PADARIA', 'Pão de Cereais de Massa Mãe', 34),
  ('PADARIA', 'Pão de Nozes', 35),
  ('PADARIA', 'Pão de Azeitonas', 36),
  ('PADARIA', 'Pão de Alfarroba', 37),
  ('PADARIA', 'Pão de Abóbora e Sementes', 38),
  ('PADARIA', 'Pão de Batata-Doce', 39),
  ('PADARIA', 'Pão de Girassol', 40),
  ('PADARIA', 'Pão de Linhaça', 41),
  ('PADARIA', 'Pão de Sésamo', 42),
  ('PADARIA', 'Pão sem Sal', 43),
  ('PADARIA', 'Pão de Forma Integral', 44),
  ('PADARIA', 'Pão de Forma de Cereais', 45),
  ('PADARIA', 'Pão de Forma Brioche', 46),
  ('PADARIA', 'Baguete Rústica', 47),
  ('PADARIA', 'Baguete Integral', 48),
  ('PADARIA', 'Baguete de Cereais', 49),
  ('PADARIA', 'Mini Baguete', 50),
  ('PADARIA', 'Bijou', 51),
  ('PADARIA', 'Molete', 52),
  ('PADARIA', 'Papo-seco', 53),
  ('PADARIA', 'Rosca de Pão', 54),
  ('PADARIA', 'Folar de Páscoa', 55),

  -- Pastelaria
  ('PASTELARIA', 'Bolo de Arroz', 16),
  ('PASTELARIA', 'Bolo de Bolacha', 17),
  ('PASTELARIA', 'Bolo de Cenoura', 18),
  ('PASTELARIA', 'Bolo de Iogurte', 19),
  ('PASTELARIA', 'Bolo de Laranja', 20),
  ('PASTELARIA', 'Bolo de Limão', 21),
  ('PASTELARIA', 'Bolo de Mármore', 22),
  ('PASTELARIA', 'Bolo de Noz', 23),
  ('PASTELARIA', 'Brownie', 24),
  ('PASTELARIA', 'Brisa do Lis', 25),
  ('PASTELARIA', 'Caracol', 26),
  ('PASTELARIA', 'Croissant com Creme', 27),
  ('PASTELARIA', 'Croissant Francês', 28),
  ('PASTELARIA', 'Éclair de Café', 29),
  ('PASTELARIA', 'Éclair de Creme', 30),
  ('PASTELARIA', 'Guardanapo', 31),
  ('PASTELARIA', 'Húngaro', 32),
  ('PASTELARIA', 'Língua de Veado', 33),
  ('PASTELARIA', 'Ninho de Ovo', 34),
  ('PASTELARIA', 'Napolitana de Creme', 35),
  ('PASTELARIA', 'Palmier Coberto', 36),
  ('PASTELARIA', 'Pastel de Feijão', 37),
  ('PASTELARIA', 'Pastel de Tentúgal', 38),
  ('PASTELARIA', 'Queijada de Sintra', 39),
  ('PASTELARIA', 'Queijada de Requeijão', 40),
  ('PASTELARIA', 'Rolo de Canela', 41),
  ('PASTELARIA', 'Salame de Chocolate', 42),
  ('PASTELARIA', 'Scone', 43),
  ('PASTELARIA', 'Sonho', 44),
  ('PASTELARIA', 'Tarte de Amêndoa', 45),
  ('PASTELARIA', 'Tarte de Limão', 46),
  ('PASTELARIA', 'Tarte de Natas', 47),
  ('PASTELARIA', 'Tarte de Fruta', 48),
  ('PASTELARIA', 'Tigelada', 49),
  ('PASTELARIA', 'Travesseiro de Sintra', 50),
  ('PASTELARIA', 'Pão de Ló', 51),
  ('PASTELARIA', 'Pão de Ló de Ovar', 52),
  ('PASTELARIA', 'Bolo de Aniversário', 53),
  ('PASTELARIA', 'Bolo-Rei', 54),
  ('PASTELARIA', 'Bolo-Rainha', 55),

  -- Salgados
  ('SALGADOS', 'Chamuça de Frango', 16),
  ('SALGADOS', 'Chamuça de Legumes', 17),
  ('SALGADOS', 'Croquete de Alheira', 18),
  ('SALGADOS', 'Croquete de Frango', 19),
  ('SALGADOS', 'Croquete Vegetariano de Espinafres', 20),
  ('SALGADOS', 'Empada de Atum', 21),
  ('SALGADOS', 'Empada de Bacalhau', 22),
  ('SALGADOS', 'Empada de Carne', 23),
  ('SALGADOS', 'Empada de Legumes', 24),
  ('SALGADOS', 'Empada de Pato', 25),
  ('SALGADOS', 'Enrolado de Salsicha', 26),
  ('SALGADOS', 'Folhado de Atum', 27),
  ('SALGADOS', 'Folhado de Carne', 28),
  ('SALGADOS', 'Folhado de Frango', 29),
  ('SALGADOS', 'Folhado de Queijo', 30),
  ('SALGADOS', 'Folhado de Espinafres', 31),
  ('SALGADOS', 'Pastel de Chaves', 32),
  ('SALGADOS', 'Pastel de Leitão', 33),
  ('SALGADOS', 'Pastel de Farinheira', 34),
  ('SALGADOS', 'Patanisca de Bacalhau', 35),
  ('SALGADOS', 'Patanisca de Legumes', 36),
  ('SALGADOS', 'Patanisca de Polvo', 37),
  ('SALGADOS', 'Peixinhos da Horta', 38),
  ('SALGADOS', 'Rissol de Atum', 39),
  ('SALGADOS', 'Rissol de Frango', 40),
  ('SALGADOS', 'Rissol de Leitão', 41),
  ('SALGADOS', 'Rissol de Pescada', 42),
  ('SALGADOS', 'Quiche de Atum', 43),
  ('SALGADOS', 'Quiche de Bacalhau', 44),
  ('SALGADOS', 'Quiche de Cogumelos', 45),
  ('SALGADOS', 'Quiche de Espinafres', 46),
  ('SALGADOS', 'Quiche de Frango', 47),
  ('SALGADOS', 'Quiche de Alho-Francês', 48),
  ('SALGADOS', 'Mini Pizza de Fiambre e Queijo', 49),
  ('SALGADOS', 'Bola de Carne', 50),
  ('SALGADOS', 'Folar de Carne', 51),
  ('SALGADOS', 'Tosta Mista', 52),
  ('SALGADOS', 'Sandes de Atum', 53),
  ('SALGADOS', 'Sandes de Panado', 54),
  ('SALGADOS', 'Sandes de Presunto e Queijo', 55);

-- Re-activate a deterministic row if this migration was applied and one of
-- its products was later soft-deleted.
update public.catalog_products product
set
  category = source.category,
  name = source.name,
  is_active = true,
  position = source.position,
  version = product.version + 1,
  updated_at = now(),
  deleted_at = null,
  deleted_by = null
from venus_catalog_expansion source
where product.tenant_id = '11111111-1111-4111-8111-111111111111'
  and product.id = md5(
    'pastelaria-venus|' || source.category::text || '|' || lower(source.name)
  )::uuid
  and (
    product.category,
    product.name,
    product.is_active,
    product.position,
    product.deleted_at
  ) is distinct from (
    source.category,
    source.name,
    true,
    source.position,
    null::timestamptz
  );

insert into public.catalog_products (
  id,
  tenant_id,
  category,
  name,
  is_active,
  position,
  version,
  created_at,
  updated_at
)
select
  md5(
    'pastelaria-venus|' || source.category::text || '|' || lower(source.name)
  )::uuid,
  '11111111-1111-4111-8111-111111111111',
  source.category,
  source.name,
  true,
  source.position,
  1,
  now(),
  now()
from venus_catalog_expansion source
on conflict (tenant_id, category, lower(name))
where deleted_at is null
do update set
  name = excluded.name,
  is_active = true,
  position = excluded.position,
  version = catalog_products.version + 1,
  updated_at = now()
where (
  catalog_products.name,
  catalog_products.is_active,
  catalog_products.position
) is distinct from (
  excluded.name,
  true,
  excluded.position
);

do $validation$
declare
  total_count integer;
begin
  select count(*)
  into total_count
  from public.catalog_products
  where tenant_id = '11111111-1111-4111-8111-111111111111'
    and deleted_at is null
    and is_active = true;

  if total_count <> 165 then
    raise exception 'expanded catalog must contain 165 active products, found %', total_count;
  end if;

  if exists (
    select 1
    from (
      select category, count(*) as total
      from public.catalog_products
      where tenant_id = '11111111-1111-4111-8111-111111111111'
        and deleted_at is null
        and is_active = true
      group by category
    ) category_count
    where category_count.total <> 55
  ) then
    raise exception 'each catalog category must contain exactly 55 active products';
  end if;

  if exists (
    select 1
    from public.catalog_products
    where tenant_id = '11111111-1111-4111-8111-111111111111'
      and deleted_at is null
      and is_active = true
    group by category, lower(name)
    having count(*) > 1
  ) then
    raise exception 'expanded catalog contains duplicate active product names';
  end if;
end
$validation$;

commit;
