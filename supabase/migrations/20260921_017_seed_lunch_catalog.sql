-- Add 50 common lunch products to the Pastelaria Venus catalog.

begin;

create temporary table venus_lunch_catalog (
  name text primary key,
  position integer not null unique
) on commit drop;

insert into venus_lunch_catalog (name, position)
values
  ('Arroz Branco', 1),
  ('Arroz de Cenoura', 2),
  ('Arroz de Feijão', 3),
  ('Arroz de Legumes', 4),
  ('Arroz e Feijão', 5),
  ('Bacalhau à Brás', 6),
  ('Bacalhau com Natas', 7),
  ('Batata Assada', 8),
  ('Batata Frita', 9),
  ('Bife Acebolado', 10),
  ('Bife de Frango Grelhado', 11),
  ('Bife de Peru Grelhado', 12),
  ('Bitoque', 13),
  ('Caldo Verde', 14),
  ('Carne Assada', 15),
  ('Carne de Porco Assada', 16),
  ('Carne Estufada', 17),
  ('Chili com Carne', 18),
  ('Costeleta de Porco', 19),
  ('Coxa de Frango Assada', 20),
  ('Dourada Grelhada', 21),
  ('Esparguete à Bolonhesa', 22),
  ('Esparguete com Frango', 23),
  ('Feijão Preto', 24),
  ('Feijão Tropeiro', 25),
  ('Feijoada', 26),
  ('Filete de Peixe', 27),
  ('Frango Assado', 28),
  ('Frango Estufado', 29),
  ('Jardineira de Carne', 30),
  ('Lasanha de Carne', 31),
  ('Lasanha de Legumes', 32),
  ('Lombo Assado', 33),
  ('Massa com Atum', 34),
  ('Massa com Frango', 35),
  ('Migas', 36),
  ('Omelete de Fiambre e Queijo', 37),
  ('Panado de Frango', 38),
  ('Panado de Porco', 39),
  ('Peixe Assado', 40),
  ('Pernil Assado', 41),
  ('Puré de Batata', 42),
  ('Salada de Alface e Tomate', 43),
  ('Salada de Atum', 44),
  ('Salada de Grão', 45),
  ('Salada Russa', 46),
  ('Salsichas com Ovo', 47),
  ('Sopa de Feijão', 48),
  ('Sopa de Legumes', 49),
  ('Strogonoff de Frango', 50);

update public.catalog_products product
set
  name = source.name,
  is_active = true,
  position = source.position,
  version = product.version + 1,
  updated_at = now(),
  deleted_at = null,
  deleted_by = null
from venus_lunch_catalog source
where product.tenant_id = '11111111-1111-4111-8111-111111111111'
  and product.category = 'ALMOÇO'
  and public.web_normalize_label(product.name) = public.web_normalize_label(source.name)
  and (
    product.name,
    product.is_active,
    product.position,
    product.deleted_at
  ) is distinct from (
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
  md5('pastelaria-venus|ALMOÇO|' || lower(source.name))::uuid,
  '11111111-1111-4111-8111-111111111111',
  'ALMOÇO',
  source.name,
  true,
  source.position,
  1,
  now(),
  now()
from venus_lunch_catalog source
where not exists (
  select 1
  from public.catalog_products product
  where product.tenant_id = '11111111-1111-4111-8111-111111111111'
    and product.category = 'ALMOÇO'
    and public.web_normalize_label(product.name) = public.web_normalize_label(source.name)
);

do $validation$
declare
  found_count integer;
begin
  select count(*)
  into found_count
  from venus_lunch_catalog source
  join public.catalog_products product
    on product.tenant_id = '11111111-1111-4111-8111-111111111111'
   and product.category = 'ALMOÇO'
   and public.web_normalize_label(product.name) = public.web_normalize_label(source.name)
  where product.deleted_at is null
    and product.is_active = true;

  if found_count <> 50 then
    raise exception 'lunch catalog must contain 50 active seeded products, found %', found_count;
  end if;
end
$validation$;

commit;
