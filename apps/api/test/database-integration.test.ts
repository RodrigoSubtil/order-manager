import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { developmentFixtureIds } from '../prisma/development-fixtures';
import { AuditService } from '../src/audit/audit.service';
import { CatalogRepository } from '../src/catalog/catalog.repository';
import { CatalogService } from '../src/catalog/catalog.service';
import type { RequestAuthentication } from '../src/common/auth/authenticated-request';
import { MembershipRole, ProductCategory, QuantityUnit } from '../src/generated/prisma/client';
import { OrdersRepository } from '../src/orders/orders.repository';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReportsRepository } from '../src/reports/reports.repository';
import { ReportsService } from '../src/reports/reports.service';
import { ResponsiblesRepository } from '../src/responsibles/responsibles.repository';
import { ResponsiblesService } from '../src/responsibles/responsibles.service';

const integrationPrefix = '[integration]';
const databaseUrl = process.env.DATABASE_URL as string;
const prisma = new PrismaService(new ConfigService({ DATABASE_URL: databaseUrl }));
const ordersRepository = new OrdersRepository(prisma);
const ordersService = new OrdersService(prisma, ordersRepository, new AuditService());
const reportsService = new ReportsService(new ReportsRepository(prisma));
const catalogRepository = new CatalogRepository(prisma);
const catalogService = new CatalogService(prisma, catalogRepository, new AuditService());
const responsiblesRepository = new ResponsiblesRepository(prisma);
const responsiblesService = new ResponsiblesService(
  prisma,
  responsiblesRepository,
  new AuditService(),
);

const alphaContext: RequestAuthentication = {
  user: {
    id: developmentFixtureIds.users.owner,
    email: 'owner@example.test',
    displayName: 'Dev Owner',
  },
  tenant: {
    membershipId: '70000000-0000-4000-8000-000000000001',
    tenantId: developmentFixtureIds.tenants.alpha,
    tenantSlug: 'alpha-bakery',
    role: MembershipRole.OWNER,
  },
};
const betaContext: RequestAuthentication = {
  ...alphaContext,
  tenant: {
    membershipId: '70000000-0000-4000-8000-000000000002',
    tenantId: developmentFixtureIds.tenants.beta,
    tenantSlug: 'beta-bakery',
    role: MembershipRole.OWNER,
  },
};

let alphaOrderId = '';
let alphaOrderVersion = 0;
let betaOrderId = '';
let betaOrderVersion = 0;

function item(
  productName: string,
  quantityValue = '1',
  quantityUnit: QuantityUnit = QuantityUnit.UN,
) {
  return {
    category: ProductCategory.PASTELARIA,
    productName,
    quantityValue,
    quantityUnit,
  };
}

async function cleanIntegrationData() {
  const orders = await prisma.order.findMany({
    where: { clientName: { startsWith: integrationPrefix } },
    select: { id: true },
  });
  const orderIds = orders.map(({ id }) => id);
  const products = await prisma.catalogProduct.findMany({
    where: { name: { startsWith: integrationPrefix } },
    select: { id: true },
  });
  const responsibles = await prisma.responsible.findMany({
    where: { name: { startsWith: integrationPrefix } },
    select: { id: true },
  });
  const entityIds = [
    ...orderIds,
    ...products.map(({ id }) => id),
    ...responsibles.map(({ id }) => id),
  ];

  if (entityIds.length) {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: entityIds } } });
  }
  if (orderIds.length) {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  await prisma.catalogProduct.deleteMany({
    where: { id: { in: products.map(({ id }) => id) } },
  });
  await prisma.responsible.deleteMany({
    where: { id: { in: responsibles.map(({ id }) => id) } },
  });

  await prisma.tenant.updateMany({
    where: { id: { in: Object.values(developmentFixtureIds.tenants) } },
    data: { nextOrderNumber: BigInt(2) },
  });
}

function expectVersionConflict(reason: unknown) {
  expect(reason).toBeInstanceOf(ConflictException);
  const response = (reason as ConflictException).getResponse();
  expect(response).toEqual(expect.objectContaining({ code: 'VERSION_CONFLICT' }));
}

jest.setTimeout(30_000);

describe('real PostgreSQL and Prisma integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.checkConnection();
    await cleanIntegrationData();
  });

  afterAll(async () => {
    await cleanIntegrationData();
    await prisma.$disconnect();
  });

  it('uses only the approved localhost development database', () => {
    const url = new URL(databaseUrl);

    expect(['localhost', '127.0.0.1', '::1']).toContain(url.hostname);
    expect(url.pathname).toBe('/order_manager_dev');
    expect(process.env.NODE_ENV).not.toBe('production');
  });

  it('contains the deterministic seed for two isolated tenants', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: Object.values(developmentFixtureIds.tenants) } },
      orderBy: { slug: 'asc' },
    });

    expect(tenants.map(({ slug }) => slug)).toEqual(['alpha-bakery', 'beta-bakery']);
    expect(
      await prisma.tenantMembership.count({
        where: { tenantId: { in: Object.values(developmentFixtureIds.tenants) } },
      }),
    ).toBe(4);
  });

  it('scopes catalog repository reads to the tenant persisted in PostgreSQL', async () => {
    const alphaProducts = await catalogRepository.findMany(alphaContext.tenant.tenantId, {
      page: 1,
      pageSize: 25,
    });

    expect(alphaProducts.map(({ id }) => id)).toContain(developmentFixtureIds.products.alpha);
    expect(alphaProducts.map(({ id }) => id)).not.toContain(developmentFixtureIds.products.beta);
    await expect(
      catalogRepository.findById(alphaContext.tenant.tenantId, developmentFixtureIds.products.beta),
    ).resolves.toBeNull();
  });

  it('persists catalog create, optimistic update and soft delete through the repository', async () => {
    const created = await catalogService.create(alphaContext, {
      name: `${integrationPrefix} catalog`,
      category: ProductCategory.PASTELARIA,
      defaultUnit: QuantityUnit.UN,
    });
    const updated = await catalogService.update(alphaContext, created.id, {
      version: created.version,
      name: `${integrationPrefix} catalog updated`,
    });

    expect(updated.version).toBe(created.version + 1);
    await expect(
      catalogRepository.findById(betaContext.tenant.tenantId, created.id),
    ).resolves.toBeNull();
    await catalogService.remove(alphaContext, created.id, updated.version);
    await expect(
      catalogRepository.findById(alphaContext.tenant.tenantId, created.id),
    ).resolves.toBeNull();
    await expect(
      prisma.catalogProduct.findUniqueOrThrow({ where: { id: created.id } }),
    ).resolves.toEqual(expect.objectContaining({ deletedAt: expect.any(Date) }));
  });

  it('scopes responsibles repository reads to the tenant persisted in PostgreSQL', async () => {
    const alphaResponsibles = await responsiblesRepository.findMany(alphaContext.tenant.tenantId, {
      page: 1,
      pageSize: 25,
    });

    expect(alphaResponsibles.map(({ id }) => id)).toContain(
      developmentFixtureIds.responsibles.alpha,
    );
    expect(alphaResponsibles.map(({ id }) => id)).not.toContain(
      developmentFixtureIds.responsibles.beta,
    );
    await expect(
      responsiblesRepository.findById(
        alphaContext.tenant.tenantId,
        developmentFixtureIds.responsibles.beta,
      ),
    ).resolves.toBeNull();
  });

  it('persists responsible create, optimistic update and soft delete through the repository', async () => {
    const created = await responsiblesService.create(alphaContext, {
      name: `${integrationPrefix} responsible`,
    });
    const updated = await responsiblesService.update(alphaContext, created.id, {
      version: created.version,
      name: `${integrationPrefix} responsible updated`,
    });

    expect(updated.version).toBe(created.version + 1);
    await expect(
      responsiblesRepository.findById(betaContext.tenant.tenantId, created.id),
    ).resolves.toBeNull();
    await responsiblesService.remove(alphaContext, created.id, updated.version);
    await expect(
      responsiblesRepository.findById(alphaContext.tenant.tenantId, created.id),
    ).resolves.toBeNull();
    await expect(
      prisma.responsible.findUniqueOrThrow({ where: { id: created.id } }),
    ).resolves.toEqual(expect.objectContaining({ deletedAt: expect.any(Date) }));
  });

  it('rolls back the order and sequence when item persistence fails', async () => {
    const tenantBefore = await prisma.tenant.findUniqueOrThrow({
      where: { id: alphaContext.tenant.tenantId },
      select: { nextOrderNumber: true },
    });

    await expect(
      ordersService.create(alphaContext, {
        clientName: `${integrationPrefix} rollback`,
        deliveryDate: '2026-08-01',
        items: [item('Invalid quantity', '-1')],
      }),
    ).rejects.toThrow();

    expect(
      await prisma.order.count({
        where: { clientName: `${integrationPrefix} rollback` },
      }),
    ).toBe(0);
    await expect(
      prisma.tenant.findUniqueOrThrow({
        where: { id: alphaContext.tenant.tenantId },
        select: { nextOrderNumber: true },
      }),
    ).resolves.toEqual(tenantBefore);
  });

  it('reserves independent sequential order numbers for each tenant', async () => {
    const [alphaOrder, betaOrder] = await Promise.all([
      ordersService.create(alphaContext, {
        clientName: `${integrationPrefix} alpha`,
        responsibleId: developmentFixtureIds.responsibles.alpha,
        deliveryDate: '2026-08-01',
        deliveryTime: '09:30',
        items: [item('Pastel integration', '2')],
      }),
      ordersService.create(betaContext, {
        clientName: `${integrationPrefix} beta`,
        responsibleId: developmentFixtureIds.responsibles.beta,
        deliveryDate: '2026-08-01',
        items: [item('Beta integration', '3')],
      }),
    ]);

    expect(alphaOrder.orderNumber).toBe('2');
    expect(betaOrder.orderNumber).toBe('2');
    alphaOrderId = alphaOrder.id;
    alphaOrderVersion = alphaOrder.version;
    betaOrderId = betaOrder.id;
    betaOrderVersion = betaOrder.version;
  });

  it('atomically edits an order and replaces its active items', async () => {
    const previousItemIds = (
      await prisma.orderItem.findMany({ where: { orderId: alphaOrderId, deletedAt: null } })
    ).map(({ id }) => id);
    const updated = await ordersService.update(alphaContext, alphaOrderId, {
      version: alphaOrderVersion,
      clientName: `${integrationPrefix} alpha edited`,
      items: [
        item('Bolo integration', '1.5', QuantityUnit.KG),
        item('Bolo integration', '500', QuantityUnit.G),
      ],
    });

    expect(updated.version).toBe(alphaOrderVersion + 1);
    expect(updated.items).toHaveLength(2);
    expect(
      await prisma.orderItem.count({
        where: { id: { in: previousItemIds }, deletedAt: { not: null } },
      }),
    ).toBe(previousItemIds.length);
    alphaOrderVersion = updated.version;
  });

  it('allows one concurrent edit and rejects the stale version', async () => {
    const results = await Promise.allSettled([
      ordersService.update(alphaContext, alphaOrderId, {
        version: alphaOrderVersion,
        clientName: `${integrationPrefix} concurrent A`,
      }),
      ordersService.update(alphaContext, alphaOrderId, {
        version: alphaOrderVersion,
        clientName: `${integrationPrefix} concurrent B`,
      }),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expectVersionConflict((rejected[0] as PromiseRejectedResult).reason);
    alphaOrderVersion = (
      fulfilled[0] as PromiseFulfilledResult<Awaited<ReturnType<OrdersService['update']>>>
    ).value.version;
  });

  it('builds tenant-scoped reports from persisted orders and items', async () => {
    const detailed = await reportsService.detailed(alphaContext, {
      from: '2026-08-01',
      until: '2026-08-31',
    });
    const summary = await reportsService.productionSummary(alphaContext, {
      from: '2026-08-01',
      until: '2026-08-31',
    });

    expect(detailed.orders.map(({ id }) => id)).toContain(alphaOrderId);
    expect(detailed.orders.map(({ id }) => id)).not.toContain(betaOrderId);
    expect(summary.orderCount).toBe(1);
    expect(summary.groups[0]?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productName: 'Bolo integration',
          quantityValue: '1.5',
          quantityUnit: QuantityUnit.KG,
        }),
        expect.objectContaining({
          productName: 'Bolo integration',
          quantityValue: '500',
          quantityUnit: QuantityUnit.G,
        }),
      ]),
    );
  });

  it('soft deletes without physically removing the order', async () => {
    await ordersService.remove(betaContext, betaOrderId, betaOrderVersion);

    const deleted = await prisma.order.findUniqueOrThrow({ where: { id: betaOrderId } });
    expect(deleted.deletedAt).toBeInstanceOf(Date);
    await expect(ordersService.get(betaContext, betaOrderId)).rejects.toThrow();
  });
});
