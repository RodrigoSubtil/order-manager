import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import {
  MembershipRole,
  MembershipStatus,
  PrismaClient,
  ProductCategory,
  QuantityUnit,
  TenantStatus,
  UserStatus,
} from '../src/generated/prisma/client';
import { assertDevelopmentDatabase } from './development-database';
import { developmentFixtureIds as fixtureIds } from './development-fixtures';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed development data.');
  }

  assertDevelopmentDatabase(databaseUrl);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: fixtureIds.users.owner },
        update: {
          displayName: 'Dev Owner',
          email: 'owner@example.test',
          status: UserStatus.ACTIVE,
        },
        create: {
          id: fixtureIds.users.owner,
          displayName: 'Dev Owner',
          email: 'owner@example.test',
          status: UserStatus.ACTIVE,
        },
      });
      await tx.user.upsert({
        where: { id: fixtureIds.users.admin },
        update: {
          displayName: 'Dev Admin',
          email: 'admin@example.test',
          status: UserStatus.ACTIVE,
        },
        create: {
          id: fixtureIds.users.admin,
          displayName: 'Dev Admin',
          email: 'admin@example.test',
          status: UserStatus.ACTIVE,
        },
      });
      await tx.user.upsert({
        where: { id: fixtureIds.users.operator },
        update: {
          displayName: 'Dev Operator',
          email: 'operator@example.test',
          status: UserStatus.ACTIVE,
        },
        create: {
          id: fixtureIds.users.operator,
          displayName: 'Dev Operator',
          email: 'operator@example.test',
          status: UserStatus.ACTIVE,
        },
      });

      await tx.tenant.upsert({
        where: { id: fixtureIds.tenants.alpha },
        update: {
          slug: 'alpha-bakery',
          name: 'Alpha Bakery',
          status: TenantStatus.ACTIVE,
          nextOrderNumber: BigInt(2),
        },
        create: {
          id: fixtureIds.tenants.alpha,
          slug: 'alpha-bakery',
          name: 'Alpha Bakery',
          status: TenantStatus.ACTIVE,
          nextOrderNumber: BigInt(2),
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });
      await tx.tenant.upsert({
        where: { id: fixtureIds.tenants.beta },
        update: {
          slug: 'beta-bakery',
          name: 'Beta Bakery',
          status: TenantStatus.ACTIVE,
          nextOrderNumber: BigInt(2),
        },
        create: {
          id: fixtureIds.tenants.beta,
          slug: 'beta-bakery',
          name: 'Beta Bakery',
          status: TenantStatus.ACTIVE,
          nextOrderNumber: BigInt(2),
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });

      for (const tenantId of Object.values(fixtureIds.tenants)) {
        await tx.tenantMembership.upsert({
          where: { tenantId_userId: { tenantId, userId: fixtureIds.users.owner } },
          update: {
            id:
              tenantId === fixtureIds.tenants.alpha
                ? fixtureIds.memberships.alphaOwner
                : fixtureIds.memberships.betaOwner,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
            isDefault: tenantId === fixtureIds.tenants.alpha,
          },
          create: {
            id:
              tenantId === fixtureIds.tenants.alpha
                ? fixtureIds.memberships.alphaOwner
                : fixtureIds.memberships.betaOwner,
            tenantId,
            userId: fixtureIds.users.owner,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
            isDefault: tenantId === fixtureIds.tenants.alpha,
            createdById: fixtureIds.users.owner,
            updatedById: fixtureIds.users.owner,
          },
        });
      }

      await tx.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: fixtureIds.tenants.alpha,
            userId: fixtureIds.users.operator,
          },
        },
        update: {
          id: fixtureIds.memberships.alphaOperator,
          role: MembershipRole.OPERATOR,
          status: MembershipStatus.ACTIVE,
          isDefault: true,
        },
        create: {
          id: fixtureIds.memberships.alphaOperator,
          tenantId: fixtureIds.tenants.alpha,
          userId: fixtureIds.users.operator,
          role: MembershipRole.OPERATOR,
          status: MembershipStatus.ACTIVE,
          isDefault: true,
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });

      await tx.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: fixtureIds.tenants.alpha,
            userId: fixtureIds.users.admin,
          },
        },
        update: {
          id: fixtureIds.memberships.alphaAdmin,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          isDefault: true,
          revokedAt: null,
          revokedById: null,
        },
        create: {
          id: fixtureIds.memberships.alphaAdmin,
          tenantId: fixtureIds.tenants.alpha,
          userId: fixtureIds.users.admin,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          isDefault: true,
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });

      for (const tenantId of Object.values(fixtureIds.tenants)) {
        await tx.tenantSettings.upsert({
          where: { tenantId },
          update: { timezone: 'Europe/Lisbon', locale: 'pt-PT', orderRetentionDays: 365 },
          create: {
            tenantId,
            timezone: 'Europe/Lisbon',
            locale: 'pt-PT',
            orderRetentionDays: 365,
            createdById: fixtureIds.users.owner,
            updatedById: fixtureIds.users.owner,
          },
        });
      }

      await tx.responsible.upsert({
        where: { id: fixtureIds.responsibles.alpha },
        update: {
          tenantId: fixtureIds.tenants.alpha,
          name: 'Maria Silva',
          isActive: true,
          position: 0,
        },
        create: {
          id: fixtureIds.responsibles.alpha,
          tenantId: fixtureIds.tenants.alpha,
          name: 'Maria Silva',
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });
      await tx.responsible.upsert({
        where: { id: fixtureIds.responsibles.beta },
        update: {
          tenantId: fixtureIds.tenants.beta,
          name: 'João Santos',
          isActive: true,
          position: 0,
        },
        create: {
          id: fixtureIds.responsibles.beta,
          tenantId: fixtureIds.tenants.beta,
          name: 'João Santos',
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });

      await tx.catalogProduct.upsert({
        where: { id: fixtureIds.products.alpha },
        update: {
          tenantId: fixtureIds.tenants.alpha,
          category: ProductCategory.PASTELARIA,
          name: 'Pastel de nata',
        },
        create: {
          id: fixtureIds.products.alpha,
          tenantId: fixtureIds.tenants.alpha,
          category: ProductCategory.PASTELARIA,
          name: 'Pastel de nata',
          defaultUnit: QuantityUnit.UN,
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });
      await tx.catalogProduct.upsert({
        where: { id: fixtureIds.products.beta },
        update: {
          tenantId: fixtureIds.tenants.beta,
          category: ProductCategory.PADARIA,
          name: 'Pão rústico',
        },
        create: {
          id: fixtureIds.products.beta,
          tenantId: fixtureIds.tenants.beta,
          category: ProductCategory.PADARIA,
          name: 'Pão rústico',
          defaultUnit: QuantityUnit.UN,
          createdById: fixtureIds.users.owner,
          updatedById: fixtureIds.users.owner,
        },
      });

      for (const fixture of [
        {
          id: fixtureIds.orders.alpha,
          tenantId: fixtureIds.tenants.alpha,
          responsibleId: fixtureIds.responsibles.alpha,
          clientName: 'Cliente Alpha',
        },
        {
          id: fixtureIds.orders.beta,
          tenantId: fixtureIds.tenants.beta,
          responsibleId: fixtureIds.responsibles.beta,
          clientName: 'Cliente Beta',
        },
      ]) {
        await tx.order.upsert({
          where: { id: fixture.id },
          update: {
            tenantId: fixture.tenantId,
            responsibleId: fixture.responsibleId,
            clientName: fixture.clientName,
            orderNumber: BigInt(1),
            deliveryDate: new Date('2026-07-16T00:00:00.000Z'),
          },
          create: {
            ...fixture,
            orderNumber: BigInt(1),
            deliveryDate: new Date('2026-07-16T00:00:00.000Z'),
            deliveryTime: new Date('1970-01-01T09:00:00.000Z'),
            createdById: fixtureIds.users.owner,
            updatedById: fixtureIds.users.owner,
          },
        });
      }

      for (const fixture of [
        {
          id: fixtureIds.items.alpha,
          tenantId: fixtureIds.tenants.alpha,
          orderId: fixtureIds.orders.alpha,
          catalogProductId: fixtureIds.products.alpha,
          category: ProductCategory.PASTELARIA,
          productName: 'Pastel de nata',
        },
        {
          id: fixtureIds.items.beta,
          tenantId: fixtureIds.tenants.beta,
          orderId: fixtureIds.orders.beta,
          catalogProductId: fixtureIds.products.beta,
          category: ProductCategory.PADARIA,
          productName: 'Pão rústico',
        },
      ]) {
        await tx.orderItem.upsert({
          where: { id: fixture.id },
          update: {
            tenantId: fixture.tenantId,
            orderId: fixture.orderId,
            catalogProductId: fixture.catalogProductId,
            category: fixture.category,
            productName: fixture.productName,
            quantityValue: 12,
            quantityUnit: QuantityUnit.UN,
            position: 0,
          },
          create: {
            ...fixture,
            quantityValue: 12,
            quantityUnit: QuantityUnit.UN,
            position: 0,
            createdById: fixtureIds.users.owner,
            updatedById: fixtureIds.users.owner,
          },
        });
      }
    });

    console.log('Seeded deterministic development data for two isolated tenants.');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
