import { ConfigService } from '@nestjs/config';

import { developmentFixtureIds } from '../prisma/development-fixtures';
import { OrderStatusFilter } from '../src/orders/dto/list-orders-query.dto';
import { OrdersRepository } from '../src/orders/orders.repository';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.DATABASE_URL as string;
const performancePrefix = '[performance]';
const volumePerTenant = 1_200;
const prisma = new PrismaService(new ConfigService({ DATABASE_URL: databaseUrl }));
const repository = new OrdersRepository(prisma);

type ExplainRow = { 'QUERY PLAN': Array<{ Plan: unknown }> };

function buildOrders(tenantId: string, clientPrefix: string) {
  return Array.from({ length: volumePerTenant }, (_, index) => ({
    tenantId,
    orderNumber: BigInt(10_000 + index),
    clientName: `${performancePrefix} ${clientPrefix} ${String(index).padStart(4, '0')}`,
    deliveryDate: new Date(`2026-09-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`),
    deliveryTime: new Date(`1970-01-01T${String(index % 24).padStart(2, '0')}:00:00.000Z`),
    createdById: developmentFixtureIds.users.owner,
    updatedById: developmentFixtureIds.users.owner,
  }));
}

async function clearPerformanceOrders() {
  await prisma.order.deleteMany({
    where: { clientName: { startsWith: performancePrefix } },
  });
}

jest.setTimeout(30_000);

describe('PostgreSQL query plans at realistic development volume', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await clearPerformanceOrders();
    await prisma.order.createMany({
      data: [
        ...buildOrders(developmentFixtureIds.tenants.alpha, 'Alpha'),
        ...buildOrders(developmentFixtureIds.tenants.beta, 'Beta'),
      ],
    });
    await prisma.$executeRawUnsafe('ANALYZE public.orders');
  });

  afterAll(async () => {
    await clearPerformanceOrders();
    await prisma.$disconnect();
  });

  it('keeps server-side pagination and text filters scoped to one tenant at volume', async () => {
    const startedAt = performance.now();
    const orders = await repository.findMany(developmentFixtureIds.tenants.alpha, {
      page: 2,
      pageSize: 25,
      status: OrderStatusFilter.ACTIVE,
      search: `${performancePrefix} Alpha`,
      from: '2026-09-01',
      until: '2026-09-28',
    });
    const elapsedMs = performance.now() - startedAt;

    expect(orders).toHaveLength(25);
    expect(orders.every((order) => order.tenantId === developmentFixtureIds.tenants.alpha)).toBe(
      true,
    );
    expect(orders.every((order) => order.clientName.includes('Alpha'))).toBe(true);
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it('uses the tenant and delivery-date index for the bounded production-list query', async () => {
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'orders'",
    );
    expect(indexes.map((index) => index.indexname)).toContain(
      'orders_tenant_id_delivery_date_delivery_time_idx',
    );

    const plan = await prisma.$queryRawUnsafe<ExplainRow[]>(
      `EXPLAIN (FORMAT JSON)
       SELECT id
       FROM public.orders
       WHERE tenant_id = $1::uuid
         AND deleted_at IS NULL
         AND delivery_date >= $2::timestamptz
         AND delivery_date <= $3::timestamptz
       ORDER BY delivery_date ASC, delivery_time ASC
       LIMIT 25`,
      developmentFixtureIds.tenants.alpha,
      '2026-09-14T00:00:00.000Z',
      '2026-09-14T23:59:59.999Z',
    );

    expect(JSON.stringify(plan[0]?.['QUERY PLAN'])).toContain(
      'orders_tenant_id_delivery_date_delivery_time_idx',
    );
  });
});
