-- Ten varied showcase orders for Pastelaria Venus.
-- Five are due on 2026-07-24 and one on each of the following five days.
-- Safe to replay: a complete previous run is a no-op and a partial run aborts.

begin;

do $seed$
declare
  tenant_id_constant constant uuid := '11111111-1111-4111-8111-111111111111';
  actor_user_id uuid;
  first_order_number bigint;
  existing_seed_orders integer;
begin
  select count(*)
  into existing_seed_orders
  from public.orders
  where tenant_id = tenant_id_constant
    and id in (
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000003',
      '30000000-0000-4000-8000-000000000004',
      '30000000-0000-4000-8000-000000000005',
      '30000000-0000-4000-8000-000000000006',
      '30000000-0000-4000-8000-000000000007',
      '30000000-0000-4000-8000-000000000008',
      '30000000-0000-4000-8000-000000000009',
      '30000000-0000-4000-8000-000000000010'
    );

  if existing_seed_orders = 10 then
    return;
  end if;

  if existing_seed_orders > 0 then
    raise exception
      'showcase seed is only partially present: % of 10 orders',
      existing_seed_orders;
  end if;

  if exists (
    select 1
    from public.order_items
    where tenant_id = tenant_id_constant
      and id::text like '31000000-0000-4000-8000-%'
  ) then
    raise exception 'showcase item ids are already in use';
  end if;

  select membership.user_id
  into actor_user_id
  from public.tenant_memberships membership
  where membership.tenant_id = tenant_id_constant
    and membership.status = 'ACTIVE'
  order by membership.created_at
  limit 1;

  if actor_user_id is null then
    raise exception 'Pastelaria Venus has no active user to own the showcase orders';
  end if;

  if (
    select count(*)
    from public.responsibles responsible
    where responsible.tenant_id = tenant_id_constant
      and responsible.id in (
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000003',
        '20000000-0000-4000-8000-000000000004',
        '20000000-0000-4000-8000-000000000005',
        '20000000-0000-4000-8000-000000000006',
        '20000000-0000-4000-8000-000000000007',
        '20000000-0000-4000-8000-000000000008',
        '20000000-0000-4000-8000-000000000009'
      )
      and responsible.deleted_at is null
      and responsible.is_active
  ) <> 9 then
    raise exception 'the approved responsible list is incomplete';
  end if;

  update public.tenants
  set
    next_order_number = next_order_number + 10,
    updated_at = now(),
    updated_by = actor_user_id
  where id = tenant_id_constant
  returning next_order_number - 10 into first_order_number;

  if first_order_number is null then
    raise exception 'Pastelaria Venus tenant was not found';
  end if;

  insert into public.orders (
    id,
    tenant_id,
    order_number,
    client_name,
    phone,
    responsible_id,
    delivery_date,
    delivery_time,
    version,
    created_at,
    updated_at,
    created_by,
    updated_by
  )
  values
    ('30000000-0000-4000-8000-000000000001', tenant_id_constant, first_order_number + 0, 'Sofia Martins', '912345601', '20000000-0000-4000-8000-000000000001', '2026-07-24', '08:30', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000002', tenant_id_constant, first_order_number + 1, 'Café Jardim', '912345602', '20000000-0000-4000-8000-000000000002', '2026-07-24', '10:00', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000003', tenant_id_constant, first_order_number + 2, 'Tiago Fernandes', '912345603', '20000000-0000-4000-8000-000000000006', '2026-07-24', '12:30', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000004', tenant_id_constant, first_order_number + 3, 'Associação Horizonte', '912345604', '20000000-0000-4000-8000-000000000004', '2026-07-24', '15:00', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000005', tenant_id_constant, first_order_number + 4, 'Inês Ribeiro', '912345605', '20000000-0000-4000-8000-000000000009', '2026-07-24', '18:00', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000006', tenant_id_constant, first_order_number + 5, 'Restaurante Aurora', '912345606', '20000000-0000-4000-8000-000000000005', '2026-07-25', '07:30', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000007', tenant_id_constant, first_order_number + 6, 'Família Costa', '912345607', '20000000-0000-4000-8000-000000000007', '2026-07-26', '09:00', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000008', tenant_id_constant, first_order_number + 7, 'Joana Almeida', '912345608', '20000000-0000-4000-8000-000000000008', '2026-07-27', '11:30', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000009', tenant_id_constant, first_order_number + 8, 'Hotel Ribeira', '912345609', '20000000-0000-4000-8000-000000000003', '2026-07-28', '06:45', 1, now(), now(), actor_user_id, actor_user_id),
    ('30000000-0000-4000-8000-000000000010', tenant_id_constant, first_order_number + 9, 'Miguel Santos', '912345610', '20000000-0000-4000-8000-000000000001', '2026-07-29', '16:30', 1, now(), now(), actor_user_id, actor_user_id);

  insert into public.order_items (
    id,
    tenant_id,
    order_id,
    category,
    product_name,
    quantity_value,
    quantity_unit,
    notes,
    position,
    created_at,
    updated_at,
    created_by,
    updated_by
  )
  values
    ('31000000-0000-4000-8000-000000000001', tenant_id_constant, '30000000-0000-4000-8000-000000000001', 'PASTELARIA', 'Pastel de Nata', 20, 'UN', 'Separar em duas caixas de 10.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000002', tenant_id_constant, '30000000-0000-4000-8000-000000000001', 'PASTELARIA', 'Croissant Misto', 10, 'UN', null, 1, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000003', tenant_id_constant, '30000000-0000-4000-8000-000000000001', 'SALGADOS', 'Rissol de Camarão', 12, 'UN', 'Bem dourados.', 2, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000004', tenant_id_constant, '30000000-0000-4000-8000-000000000002', 'PADARIA', 'Pão de Água', 30, 'UN', null, 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000005', tenant_id_constant, '30000000-0000-4000-8000-000000000002', 'PADARIA', 'Baguete', 12, 'UN', 'Cozedura clara.', 1, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000006', tenant_id_constant, '30000000-0000-4000-8000-000000000002', 'SALGADOS', 'Empada de Galinha', 15, 'UN', null, 2, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000007', tenant_id_constant, '30000000-0000-4000-8000-000000000003', 'PASTELARIA', 'Bolo de Aniversário de Chocolate', 2.5, 'KG', 'Escrever “Parabéns Leonor” e decorar em tons rosa.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000008', tenant_id_constant, '30000000-0000-4000-8000-000000000003', 'SALGADOS', 'Mini Coxinha de Frango', 24, 'UN', 'Tamanho de festa.', 1, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000009', tenant_id_constant, '30000000-0000-4000-8000-000000000004', 'PADARIA', 'Bola de Mistura', 40, 'UN', 'Embalar em sacos de 10.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000010', tenant_id_constant, '30000000-0000-4000-8000-000000000004', 'SALGADOS', 'Lanche Misto', 25, 'UN', null, 1, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000011', tenant_id_constant, '30000000-0000-4000-8000-000000000005', 'PASTELARIA', 'Tarte de Maçã', 1, 'UN', 'Cortar em 10 fatias.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000012', tenant_id_constant, '30000000-0000-4000-8000-000000000005', 'PASTELARIA', 'Éclair de Chocolate', 8, 'UN', null, 1, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000013', tenant_id_constant, '30000000-0000-4000-8000-000000000005', 'SALGADOS', 'Pão de Queijo', 10, 'UN', 'Entregar ainda morno.', 2, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000014', tenant_id_constant, '30000000-0000-4000-8000-000000000006', 'PADARIA', 'Carcaça', 50, 'UN', 'Cozedura média.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000015', tenant_id_constant, '30000000-0000-4000-8000-000000000006', 'PADARIA', 'Pão de Cereais', 20, 'UN', null, 1, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000016', tenant_id_constant, '30000000-0000-4000-8000-000000000006', 'SALGADOS', 'Croquete de Carne', 15, 'UN', 'Embalar separadamente do pão.', 2, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000017', tenant_id_constant, '30000000-0000-4000-8000-000000000007', 'PASTELARIA', 'Bolo de Batizado', 2, 'KG', 'Cobertura branca, detalhes dourados e nome “Mateus”.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000018', tenant_id_constant, '30000000-0000-4000-8000-000000000007', 'PASTELARIA', 'Pastel de Nata', 30, 'UN', 'Canela em saqueta separada.', 1, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000019', tenant_id_constant, '30000000-0000-4000-8000-000000000008', 'PASTELARIA', 'Croissant de Chocolate', 18, 'UN', null, 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000020', tenant_id_constant, '30000000-0000-4000-8000-000000000008', 'PASTELARIA', 'Palmier', 12, 'UN', 'Seis simples e seis cobertos com chocolate.', 1, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000021', tenant_id_constant, '30000000-0000-4000-8000-000000000008', 'SALGADOS', 'Quiche de Legumes', 10, 'UN', null, 2, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000022', tenant_id_constant, '30000000-0000-4000-8000-000000000009', 'PADARIA', 'Baguete', 40, 'UN', 'Embalagem reforçada para transporte.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000023', tenant_id_constant, '30000000-0000-4000-8000-000000000009', 'PADARIA', 'Pão de Leite', 35, 'UN', null, 1, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000024', tenant_id_constant, '30000000-0000-4000-8000-000000000009', 'SALGADOS', 'Merenda Mista', 20, 'UN', 'Entregar na receção do hotel.', 2, now(), now(), actor_user_id, actor_user_id),

    ('31000000-0000-4000-8000-000000000025', tenant_id_constant, '30000000-0000-4000-8000-000000000010', 'PASTELARIA', 'Bolo Red Velvet', 1.8, 'KG', 'Sem frutos secos e com placa “Parabéns Miguel”.', 0, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000026', tenant_id_constant, '30000000-0000-4000-8000-000000000010', 'PASTELARIA', 'Brigadeiro', 20, 'UN', 'Metade chocolate, metade coco.', 1, now(), now(), actor_user_id, actor_user_id),
    ('31000000-0000-4000-8000-000000000027', tenant_id_constant, '30000000-0000-4000-8000-000000000010', 'SALGADOS', 'Coxinha de Frango', 12, 'UN', null, 2, now(), now(), actor_user_id, actor_user_id);
end
$seed$;

commit;
