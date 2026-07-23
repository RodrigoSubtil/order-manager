import { createHash } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import {
  MembershipStatus,
  PrismaClient,
  TenantStatus,
  UserStatus,
} from '../../src/generated/prisma/client';
import { assertDevelopmentDatabase } from '../development-database';
import { analyzeLegacyExport } from './analyze';
import type { LegacyAnalysis, LegacyExport, MigrationIssue, ReconciliationReport } from './types';

export async function runLegacyMigration(options: {
  source: LegacyExport;
  databaseUrl?: string;
  apply: boolean;
}): Promise<ReconciliationReport> {
  const startedAt = new Date();
  const analysis = analyzeLegacyExport(options.source);
  const base = reportBase(analysis, options.databaseUrl ?? null, startedAt);

  if (analysis.issues.some((issue) => issue.severity === 'BLOCKING')) {
    return finishReport({ ...base, status: 'BLOCKED' }, startedAt);
  }
  if (!options.apply) return finishReport({ ...base, status: 'DRY_RUN_READY' }, startedAt);
  if (!options.databaseUrl) throw new Error('DATABASE_URL is required when --apply is used.');
  assertDevelopmentDatabase(options.databaseUrl);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: options.databaseUrl }),
  });
  try {
    const auditId = deterministicUuid(`AUDIT:${analysis.source.migration.batchId}`);
    const existingAudit = await prisma.auditLog.findUnique({ where: { id: auditId } });
    const collisionIssues = await detectTargetCollisions(prisma, analysis, Boolean(existingAudit));
    if (collisionIssues.length) {
      return finishReport(
        { ...base, status: 'BLOCKED', issues: [...base.issues, ...collisionIssues] },
        startedAt,
      );
    }

    await persistMigration(prisma, analysis, auditId);
    const reconciled = await reconcile(prisma, analysis);
    const status = reconciliationMatches(analysis, reconciled)
      ? 'MIGRATED'
      : 'FAILED_RECONCILIATION';

    return finishReport(
      {
        ...base,
        ...reconciled,
        status,
        idempotentReplay: Boolean(existingAudit),
      },
      startedAt,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function persistMigration(
  prisma: PrismaClient,
  analysis: LegacyAnalysis,
  auditId: string,
): Promise<void> {
  const { source } = analysis;
  const tenant = source.migration.tenant;
  const owner = source.migration.userMappings.find((mapping) => mapping.role === 'OWNER')!;

  await prisma.$transaction(async (transaction) => {
    for (const mapping of source.migration.userMappings) {
      await transaction.user.upsert({
        where: { id: mapping.userId },
        update: {
          displayName: mapping.displayName,
          email: mapping.email,
          status: UserStatus.ACTIVE,
        },
        create: {
          id: mapping.userId,
          displayName: mapping.displayName,
          email: mapping.email,
          status: UserStatus.ACTIVE,
        },
      });
    }

    await transaction.tenant.upsert({
      where: { id: tenant.id },
      update: {
        slug: tenant.slug,
        name: tenant.name,
        status: TenantStatus.ACTIVE,
        updatedById: owner.userId,
      },
      create: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: TenantStatus.ACTIVE,
        createdById: owner.userId,
        updatedById: owner.userId,
      },
    });

    for (const mapping of source.migration.userMappings) {
      const membershipId = deterministicUuid(`MEMBERSHIP:${tenant.id}:${mapping.userId}`);
      await transaction.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: mapping.userId } },
        update: {
          id: membershipId,
          role: mapping.role,
          status: MembershipStatus.ACTIVE,
          isDefault: mapping.role === 'OWNER',
          revokedAt: null,
          revokedById: null,
          updatedById: owner.userId,
        },
        create: {
          id: membershipId,
          tenantId: tenant.id,
          userId: mapping.userId,
          role: mapping.role,
          status: MembershipStatus.ACTIVE,
          isDefault: mapping.role === 'OWNER',
          createdById: owner.userId,
          updatedById: owner.userId,
        },
      });
    }

    await transaction.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: { timezone: tenant.timezone, locale: tenant.locale, updatedById: owner.userId },
      create: {
        tenantId: tenant.id,
        timezone: tenant.timezone,
        locale: tenant.locale,
        createdById: owner.userId,
        updatedById: owner.userId,
      },
    });

    for (const responsible of analysis.responsibles) {
      await transaction.responsible.upsert({
        where: { id: responsible.targetId },
        update: {
          tenantId: tenant.id,
          name: responsible.name,
          isActive: responsible.isActive,
          position: responsible.position ?? 0,
          deletedAt: null,
          deletedById: null,
          updatedById: responsible.targetUserId,
        },
        create: {
          id: responsible.targetId,
          tenantId: tenant.id,
          name: responsible.name,
          isActive: responsible.isActive,
          position: responsible.position ?? 0,
          createdById: responsible.targetUserId,
          updatedById: responsible.targetUserId,
        },
      });
    }

    for (const product of analysis.catalogProducts) {
      await transaction.catalogProduct.upsert({
        where: { id: product.targetId },
        update: {
          tenantId: tenant.id,
          category: product.targetCategory,
          name: product.name,
          defaultUnit: source.migration.defaults.catalogProductUnit,
          isActive: product.isActive,
          position: product.position ?? 0,
          deletedAt: null,
          deletedById: null,
          updatedById: owner.userId,
        },
        create: {
          id: product.targetId,
          tenantId: tenant.id,
          category: product.targetCategory,
          name: product.name,
          defaultUnit: source.migration.defaults.catalogProductUnit,
          isActive: product.isActive,
          position: product.position ?? 0,
          createdById: owner.userId,
          updatedById: owner.userId,
        },
      });
    }

    for (const order of analysis.orders) {
      await transaction.order.upsert({
        where: { id: order.targetId },
        update: {
          tenantId: tenant.id,
          orderNumber: order.targetOrderNumber,
          clientName: order.clientName,
          phone: order.phone,
          responsibleId: order.targetResponsibleId,
          deliveryDate: new Date(`${order.deliveryDate}T00:00:00.000Z`),
          deliveryTime: toTime(order.deliveryTime),
          deletedAt: null,
          deletedById: null,
          updatedById: order.targetUserId,
        },
        create: {
          id: order.targetId,
          tenantId: tenant.id,
          orderNumber: order.targetOrderNumber,
          clientName: order.clientName,
          phone: order.phone,
          responsibleId: order.targetResponsibleId,
          deliveryDate: new Date(`${order.deliveryDate}T00:00:00.000Z`),
          deliveryTime: toTime(order.deliveryTime),
          createdAt: new Date(order.createdAt),
          createdById: order.targetUserId,
          updatedById: order.targetUserId,
        },
      });
    }

    for (const item of analysis.orderItems) {
      const order = analysis.orders.find((candidate) => candidate.targetId === item.targetOrderId)!;
      await transaction.orderItem.upsert({
        where: { id: item.targetId },
        update: {
          tenantId: tenant.id,
          orderId: item.targetOrderId,
          category: item.targetCategory,
          productName: item.product,
          quantityValue: item.quantityValue,
          quantityUnit: item.quantityUnit,
          notes: item.notes,
          position: item.position ?? 0,
          deletedAt: null,
          deletedById: null,
          updatedById: order.targetUserId,
        },
        create: {
          id: item.targetId,
          tenantId: tenant.id,
          orderId: item.targetOrderId,
          category: item.targetCategory,
          productName: item.product,
          quantityValue: item.quantityValue,
          quantityUnit: item.quantityUnit,
          notes: item.notes,
          position: item.position ?? 0,
          createdById: order.targetUserId,
          updatedById: order.targetUserId,
        },
      });
    }

    const maximumOrderNumber = analysis.orders.reduce(
      (maximum, order) => (order.targetOrderNumber > maximum ? order.targetOrderNumber : maximum),
      BigInt(0),
    );
    const currentTenant = await transaction.tenant.findUniqueOrThrow({
      where: { id: tenant.id },
      select: { nextOrderNumber: true },
    });
    const proposedNextOrderNumber = maximumOrderNumber + BigInt(1);
    await transaction.tenant.update({
      where: { id: tenant.id },
      data: {
        nextOrderNumber:
          currentTenant.nextOrderNumber > proposedNextOrderNumber
            ? currentTenant.nextOrderNumber
            : proposedNextOrderNumber,
        updatedById: owner.userId,
      },
    });
    await transaction.auditLog.upsert({
      where: { id: auditId },
      update: {
        actorUserId: owner.userId,
        metadata: migrationAuditMetadata(analysis),
      },
      create: {
        id: auditId,
        tenantId: tenant.id,
        actorUserId: owner.userId,
        action: 'LEGACY_DATA_MIGRATED',
        entityType: 'TENANT',
        entityId: tenant.id,
        metadata: migrationAuditMetadata(analysis),
      },
    });
  });
}

async function detectTargetCollisions(
  prisma: PrismaClient,
  analysis: LegacyAnalysis,
  isReplay: boolean,
): Promise<MigrationIssue[]> {
  const tenantId = analysis.source.migration.tenant.id;
  const issues: MigrationIssue[] = [];
  const [tenantById, tenantBySlug, users] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true },
    }),
    prisma.tenant.findUnique({
      where: { slug: analysis.source.migration.tenant.slug },
      select: { id: true, slug: true },
    }),
    prisma.user.findMany({
      where: {
        id: {
          in: analysis.source.migration.userMappings.map((mapping) => mapping.userId),
        },
      },
      select: { id: true, email: true },
    }),
  ]);
  if (tenantById && tenantById.slug !== analysis.source.migration.tenant.slug) {
    issues.push(targetCollision('tenants', tenantById.id, 'Target tenant id has another slug.'));
  }
  if (tenantBySlug && tenantBySlug.id !== tenantId) {
    issues.push(
      targetCollision('tenants', tenantBySlug.id, 'Target tenant slug belongs to another id.'),
    );
  }
  if (tenantById && !isReplay) {
    const existingRows = await countTenantBusinessRows(prisma, tenantId);
    if (existingRows > 0) {
      issues.push(
        targetCollision(
          'tenants',
          tenantId,
          'Target tenant already contains business data from another batch.',
        ),
      );
    }
  }
  const mappingsByUser = new Map(
    analysis.source.migration.userMappings.map((mapping) => [mapping.userId, mapping]),
  );
  for (const user of users) {
    const mapping = mappingsByUser.get(user.id);
    if (mapping && user.email !== mapping.email) {
      issues.push(targetCollision('users', user.id, 'Target Auth user id has a different email.'));
    }
  }

  for (const [entity, records] of [
    [
      'orders',
      await prisma.order.findMany({
        where: { id: { in: analysis.orders.map((item) => item.targetId) } },
        select: { id: true, tenantId: true },
      }),
    ],
    [
      'order_items',
      await prisma.orderItem.findMany({
        where: { id: { in: analysis.orderItems.map((item) => item.targetId) } },
        select: { id: true, tenantId: true },
      }),
    ],
    [
      'responsibles',
      await prisma.responsible.findMany({
        where: { id: { in: analysis.responsibles.map((item) => item.targetId) } },
        select: { id: true, tenantId: true },
      }),
    ],
    [
      'catalog_products',
      await prisma.catalogProduct.findMany({
        where: { id: { in: analysis.catalogProducts.map((item) => item.targetId) } },
        select: { id: true, tenantId: true },
      }),
    ],
  ] as const) {
    for (const record of records) {
      if (record.tenantId !== tenantId) {
        issues.push({
          severity: 'BLOCKING',
          code: 'TARGET_ID_COLLISION',
          entity,
          sourceId: record.id,
          message: 'A target id already belongs to another tenant.',
        });
      }
    }
  }

  const incomingIds = new Map(
    analysis.orders.map((order) => [order.targetOrderNumber.toString(), order.targetId]),
  );
  const numberCollisions = await prisma.order.findMany({
    where: {
      tenantId,
      orderNumber: { in: analysis.orders.map((order) => order.targetOrderNumber) },
    },
    select: { id: true, orderNumber: true },
  });
  for (const collision of numberCollisions) {
    if (incomingIds.get(collision.orderNumber.toString()) !== collision.id) {
      issues.push({
        severity: 'BLOCKING',
        code: 'TARGET_ORDER_NUMBER_COLLISION',
        entity: 'orders',
        sourceId: collision.id,
        rawValue: collision.orderNumber.toString(),
        message: 'An order number already belongs to another target order.',
      });
    }
  }
  return issues;
}

async function countTenantBusinessRows(prisma: PrismaClient, tenantId: string): Promise<number> {
  const counts = await Promise.all([
    prisma.order.count({ where: { tenantId } }),
    prisma.orderItem.count({ where: { tenantId } }),
    prisma.responsible.count({ where: { tenantId } }),
    prisma.catalogProduct.count({ where: { tenantId } }),
  ]);
  return counts.reduce((total, count) => total + count, 0);
}

async function reconcile(prisma: PrismaClient, analysis: LegacyAnalysis) {
  const tenantId = analysis.source.migration.tenant.id;
  const [orders, orderItems, responsibles, catalogProducts, memberships, users, tenant] =
    await Promise.all([
      prisma.order.count({ where: { tenantId } }),
      prisma.orderItem.count({ where: { tenantId } }),
      prisma.responsible.count({ where: { tenantId } }),
      prisma.catalogProduct.count({ where: { tenantId } }),
      prisma.tenantMembership.count({ where: { tenantId } }),
      prisma.user.count({
        where: { id: { in: analysis.source.migration.userMappings.map((item) => item.userId) } },
      }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { nextOrderNumber: true } }),
    ]);
  const ordersWithoutItems = await prisma.order.findMany({
    where: { tenantId, items: { none: { deletedAt: null } } },
    select: { id: true },
  });
  const migratedIds = analysis.idMappings.map((mapping) => mapping.targetId);
  const foreignTenantRows =
    (await prisma.order.count({
      where: { id: { in: migratedIds }, tenantId: { not: tenantId } },
    })) +
    (await prisma.orderItem.count({
      where: { id: { in: migratedIds }, tenantId: { not: tenantId } },
    })) +
    (await prisma.responsible.count({
      where: { id: { in: migratedIds }, tenantId: { not: tenantId } },
    })) +
    (await prisma.catalogProduct.count({
      where: { id: { in: migratedIds }, tenantId: { not: tenantId } },
    }));
  const destinationOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*)::bigint AS count
    FROM order_items item
    LEFT JOIN orders parent
      ON parent.tenant_id = item.tenant_id
     AND parent.id = item.order_id
    WHERE item.tenant_id = ${tenantId}::uuid
      AND parent.id IS NULL
  `;
  const destinationOrphanCount = Number(destinationOrphans[0]?.count ?? 0);
  const maximumOrderNumber = analysis.orders.reduce(
    (maximum, order) => (order.targetOrderNumber > maximum ? order.targetOrderNumber : maximum),
    BigInt(0),
  );
  const expectedNextOrderNumber = maximumOrderNumber + BigInt(1);
  const sourceOrphanCount = analysis.issues.filter((issue) =>
    ['ORDER_PRODUCT_ORPHAN', 'RESPONSIBLE_ORPHAN'].includes(issue.code),
  ).length;
  const countsMatch =
    users === analysis.source.migration.userMappings.length &&
    memberships === analysis.source.migration.userMappings.length &&
    orders === analysis.sourceCounts.orders &&
    orderItems === analysis.sourceCounts.orderItems &&
    responsibles === analysis.sourceCounts.responsibles &&
    catalogProducts === analysis.sourceCounts.catalogProducts;

  return {
    destinationCounts: { users, memberships, orders, orderItems, responsibles, catalogProducts },
    orphanCounts: {
      sourceOrderProducts: analysis.issues.filter((issue) => issue.code === 'ORDER_PRODUCT_ORPHAN')
        .length,
      sourceResponsibles: analysis.issues.filter((issue) => issue.code === 'RESPONSIBLE_ORPHAN')
        .length,
      destinationOrderItems: destinationOrphanCount,
    },
    ordersWithoutItems: { source: [], destination: ordersWithoutItems.map((order) => order.id) },
    isolation: { expectedTenantId: tenantId, foreignTenantRows },
    nextOrderNumber: tenant?.nextOrderNumber.toString() ?? null,
    checks: {
      countsMatch,
      noSourceOrphans: sourceOrphanCount === 0,
      noDestinationOrphans: destinationOrphanCount === 0,
      everyOrderHasItems: ordersWithoutItems.length === 0,
      tenantIsolation: foreignTenantRows === 0,
      nextOrderNumberValid: tenant !== null && tenant.nextOrderNumber >= expectedNextOrderNumber,
    },
  };
}

function reconciliationMatches(
  analysis: LegacyAnalysis,
  result: Awaited<ReturnType<typeof reconcile>>,
): boolean {
  const expected = analysis.sourceCounts;
  return (
    expected.orders === analysis.orders.length &&
    expected.orderItems === analysis.orderItems.length &&
    Object.values(result.checks).every(Boolean)
  );
}

function targetCollision(entity: string, sourceId: string, message: string): MigrationIssue {
  return {
    severity: 'BLOCKING',
    code: 'TARGET_ID_COLLISION',
    entity,
    sourceId,
    message,
  };
}

function reportBase(
  analysis: LegacyAnalysis,
  databaseUrl: string | null,
  startedAt: Date,
): ReconciliationReport {
  const sourceOrdersWithoutItems = analysis.issues
    .filter((issue) => issue.code === 'ORDER_WITHOUT_ITEMS')
    .flatMap((issue) => (issue.sourceId ? [issue.sourceId] : []));
  return {
    batchId: analysis.source.migration.batchId,
    sourceKind:
      analysis.source.export.sourceEnvironment === 'fixture' ? 'FIXTURE' : 'AUTHORIZED_EXPORT',
    status: 'BLOCKED',
    database: databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, '') : null,
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    elapsedMs: 0,
    idempotentReplay: false,
    metadataConfirmed: analysis.metadataConfirmed,
    sourceCounts: analysis.sourceCounts,
    destinationCounts: {},
    issues: analysis.issues,
    duplicateGroups: analysis.duplicateGroups,
    idMappings: analysis.idMappings,
    orphanCounts: {
      sourceOrderProducts: analysis.issues.filter((issue) => issue.code === 'ORDER_PRODUCT_ORPHAN')
        .length,
      sourceResponsibles: analysis.issues.filter((issue) => issue.code === 'RESPONSIBLE_ORPHAN')
        .length,
      destinationOrderItems: 0,
    },
    ordersWithoutItems: { source: sourceOrdersWithoutItems, destination: [] },
    isolation: { expectedTenantId: analysis.source.migration.tenant.id, foreignTenantRows: 0 },
    nextOrderNumber: null,
    checks: {
      countsMatch: false,
      noSourceOrphans: false,
      noDestinationOrphans: false,
      everyOrderHasItems: false,
      tenantIsolation: false,
      nextOrderNumberValid: false,
    },
  };
}

function finishReport(report: ReconciliationReport, startedAt: Date): ReconciliationReport {
  const finishedAt = new Date();
  return {
    ...report,
    finishedAt: finishedAt.toISOString(),
    elapsedMs: finishedAt.getTime() - startedAt.getTime(),
  };
}

function migrationAuditMetadata(analysis: LegacyAnalysis) {
  return {
    batchId: analysis.source.migration.batchId,
    sourceCounts: analysis.sourceCounts,
    rekeyedIds: analysis.idMappings.filter((mapping) => !mapping.preserved).length,
    warnings: analysis.issues.filter((issue) => issue.severity === 'WARNING').length,
  };
}

function toTime(value: string | null): Date | null {
  if (!value) return null;
  const normalized = value.length === 5 ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}Z`);
}

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(
    createHash('sha256').update(`order-manager-legacy:${value}`).digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
