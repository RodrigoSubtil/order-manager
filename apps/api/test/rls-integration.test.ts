import { ConfigService } from '@nestjs/config';

import { developmentFixtureIds } from '../prisma/development-fixtures';
import { AuditService } from '../src/audit/audit.service';
import type { RequestAuthentication } from '../src/common/auth/authenticated-request';
import {
  MembershipRole,
  MembershipStatus,
  ProductCategory,
  QuantityUnit,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenantAccessService } from '../src/tenants/tenant-access.service';
import { TenantMembershipsService } from '../src/tenants/tenant-memberships.service';
import { UsersService } from '../src/users/users.service';

const databaseUrl = process.env.DATABASE_URL as string;
const prisma = new PrismaService(new ConfigService({ DATABASE_URL: databaseUrl }));

let alphaContext: RequestAuthentication;
let betaContext: RequestAuthentication;
let operatorContext: RequestAuthentication;
let adminContext: RequestAuthentication;

const membershipsService = new TenantMembershipsService(
  prisma,
  {} as never,
  {} as never,
  new AuditService(),
);

describe('PostgreSQL RLS tenant isolation', () => {
  beforeAll(async () => {
    await prisma.$connect();
    const memberships = await prisma.tenantMembership.findMany({
      where: { userId: { in: Object.values(developmentFixtureIds.users) } },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        role: true,
        tenant: { select: { slug: true } },
      },
    });
    const alphaOwner = memberships.find(
      (item) =>
        item.userId === developmentFixtureIds.users.owner &&
        item.tenantId === developmentFixtureIds.tenants.alpha,
    )!;
    const betaOwner = memberships.find(
      (item) =>
        item.userId === developmentFixtureIds.users.owner &&
        item.tenantId === developmentFixtureIds.tenants.beta,
    )!;
    const alphaOperator = memberships.find(
      (item) => item.userId === developmentFixtureIds.users.operator,
    )!;
    const alphaAdmin = memberships.find(
      (item) => item.userId === developmentFixtureIds.users.admin,
    )!;

    alphaContext = context(alphaOwner, developmentFixtureIds.users.owner, 'owner@example.test');
    betaContext = context(betaOwner, developmentFixtureIds.users.owner, 'owner@example.test');
    operatorContext = context(
      alphaOperator,
      developmentFixtureIds.users.operator,
      'operator@example.test',
    );
    adminContext = context(alphaAdmin, developmentFixtureIds.users.admin, 'admin@example.test');
    await resetAdminMembership();
  });

  afterAll(async () => {
    await resetAdminMembership();
    await prisma.$disconnect();
  });

  it('limits an unfiltered backend query to the active tenant', async () => {
    const products = await prisma.withTenantContext(alphaContext, () =>
      prisma.client().catalogProduct.findMany({ select: { id: true, tenantId: true } }),
    );
    expect(products).toContainEqual({
      id: developmentFixtureIds.products.alpha,
      tenantId: developmentFixtureIds.tenants.alpha,
    });
    expect(products.some(({ tenantId }) => tenantId === developmentFixtureIds.tenants.beta)).toBe(
      false,
    );
  });

  it('synchronizes a verified profile and creates a tenant with its first OWNER atomically', async () => {
    const userId = '81000000-0000-4000-8000-000000000001';
    let tenantId: string | undefined;
    try {
      await new UsersService(prisma).synchronizeIdentity({
        id: userId,
        email: 'new-owner@example.test',
        displayName: 'New Owner',
      });
      const service = new TenantMembershipsService(
        prisma,
        new TenantAccessService(prisma),
        {} as never,
        new AuditService(),
      );
      const membership = await service.createTenant(
        { id: userId, email: 'new-owner@example.test', displayName: 'New Owner' },
        { name: 'RLS Test Tenant', slug: 'rls-test-tenant' },
      );
      tenantId = membership.tenant.id;

      expect(membership).toEqual(
        expect.objectContaining({ role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE }),
      );
      await expect(prisma.tenantSettings.findUnique({ where: { tenantId } })).resolves.toBeTruthy();
    } finally {
      if (tenantId) {
        await prisma.auditLog.deleteMany({ where: { tenantId } });
        await prisma.tenantSettings.deleteMany({ where: { tenantId } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId } });
        await prisma.tenant.delete({ where: { id: tenantId } });
      }
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it('creates, accepts and safely resolves an invitation without accepting tenant_id from the client', async () => {
    const invitedUserId = '82000000-0000-4000-8000-000000000001';
    const invitationProvider = {
      invite: jest.fn().mockResolvedValue({
        id: invitedUserId,
        email: 'invited@example.test',
        displayName: 'Invited User',
      }),
    };
    const tenantAccess = new TenantAccessService(prisma);
    const service = new TenantMembershipsService(
      prisma,
      tenantAccess,
      invitationProvider as never,
      new AuditService(),
    );
    let membershipId: string | undefined;

    try {
      const invitation = await prisma.withTenantContext(alphaContext, () =>
        service.invite(alphaContext, {
          email: 'invited@example.test',
          role: MembershipRole.OPERATOR,
        }),
      );
      membershipId = invitation.id;
      expect(invitation.status).toBe(MembershipStatus.INVITED);

      const accepted = await service.acceptInvitation(invitedUserId, invitation.id);
      expect(accepted.status).toBe(MembershipStatus.ACTIVE);
      const activeTenant = await service.switchTenant(invitedUserId, invitation.id);
      expect(activeTenant).toEqual(
        expect.objectContaining({
          membershipId: invitation.id,
          tenantId: developmentFixtureIds.tenants.alpha,
          role: MembershipRole.OPERATOR,
        }),
      );
    } finally {
      if (membershipId) {
        await prisma.auditLog.deleteMany({ where: { entityId: membershipId } });
        await prisma.tenantMembership.deleteMany({ where: { id: membershipId } });
      }
      await prisma.user.deleteMany({ where: { id: invitedUserId } });
    }
  });

  it('hides a known UUID belonging to another tenant', async () => {
    const product = await prisma.withTenantContext(alphaContext, () =>
      prisma
        .client()
        .catalogProduct.findUnique({ where: { id: developmentFixtureIds.products.beta } }),
    );
    expect(product).toBeNull();
  });

  it('blocks cross-tenant INSERT even when a repository supplies the wrong tenant id', async () => {
    await expect(
      prisma.withTenantContext(alphaContext, () =>
        prisma.client().catalogProduct.create({
          data: {
            tenantId: developmentFixtureIds.tenants.beta,
            name: '[rls] forbidden product',
            category: ProductCategory.PASTELARIA,
            defaultUnit: QuantityUnit.UN,
            createdById: developmentFixtureIds.users.owner,
            updatedById: developmentFixtureIds.users.owner,
          },
        }),
      ),
    ).rejects.toBeDefined();
  });

  it('blocks physical DELETE for the backend role', async () => {
    await expect(
      prisma.withTenantContext(alphaContext, () =>
        prisma
          .client()
          .catalogProduct.delete({ where: { id: developmentFixtureIds.products.alpha } }),
      ),
    ).rejects.toBeDefined();
  });

  it('enforces role-specific catalog and audit policies', async () => {
    await expect(
      prisma.withTenantContext(operatorContext, () =>
        prisma.client().catalogProduct.create({
          data: {
            tenantId: developmentFixtureIds.tenants.alpha,
            name: '[rls] operator forbidden',
            category: ProductCategory.PASTELARIA,
            defaultUnit: QuantityUnit.UN,
            createdById: developmentFixtureIds.users.operator,
            updatedById: developmentFixtureIds.users.operator,
          },
        }),
      ),
    ).rejects.toBeDefined();

    const operatorAudit = await prisma.withTenantContext(operatorContext, () =>
      prisma.client().auditLog.findMany(),
    );
    expect(operatorAudit).toEqual([]);
    await expect(
      prisma.withTenantContext(alphaContext, () => prisma.client().auditLog.findMany()),
    ).resolves.toBeInstanceOf(Array);

    const adminUpdate = await prisma.withTenantContext(adminContext, () =>
      prisma.client().catalogProduct.updateMany({
        where: { id: developmentFixtureIds.products.alpha },
        data: { updatedById: developmentFixtureIds.users.admin },
      }),
    );
    expect(adminUpdate.count).toBe(1);

    const operatorOrderUpdate = await prisma.withTenantContext(operatorContext, () =>
      prisma.client().order.updateMany({
        where: { id: developmentFixtureIds.orders.alpha },
        data: { phone: null, updatedById: developmentFixtureIds.users.operator },
      }),
    );
    expect(operatorOrderUpdate.count).toBe(1);
  });

  it('supports controlled suspension, reactivation and revocation of a non-owner membership', async () => {
    const membershipId = developmentFixtureIds.memberships.alphaAdmin;
    await expect(
      prisma.withTenantContext(alphaContext, () =>
        membershipsService.manage(alphaContext, membershipId, {
          status: MembershipStatus.SUSPENDED,
        }),
      ),
    ).resolves.toEqual(expect.objectContaining({ status: 'SUSPENDED' }));

    await expect(
      prisma.withTenantContext(alphaContext, () =>
        membershipsService.manage(alphaContext, membershipId, { status: MembershipStatus.ACTIVE }),
      ),
    ).resolves.toEqual(expect.objectContaining({ status: 'ACTIVE' }));

    await expect(
      prisma.withTenantContext(alphaContext, () =>
        membershipsService.manage(alphaContext, membershipId, { status: MembershipStatus.REVOKED }),
      ),
    ).resolves.toEqual(expect.objectContaining({ status: 'REVOKED' }));

    await prisma.withTenantContext(alphaContext, () =>
      membershipsService.manage(alphaContext, membershipId, { status: MembershipStatus.ACTIVE }),
    );
    const persisted = await prisma.tenantMembership.findUnique({ where: { id: membershipId } });
    expect(persisted).toEqual(
      expect.objectContaining({ status: 'ACTIVE', revokedAt: null, revokedById: null }),
    );
  });

  it('enforces the last OWNER rule in PostgreSQL even if service validation is bypassed', async () => {
    await expect(
      prisma.withTenantContext(alphaContext, () =>
        prisma.client().tenantMembership.updateMany({
          where: { id: developmentFixtureIds.memberships.alphaOwner },
          data: { status: MembershipStatus.SUSPENDED, isDefault: false },
        }),
      ),
    ).rejects.toBeDefined();
  });

  it('returns no business rows without an active tenant context', async () => {
    const products = await prisma.withIdentityContext(developmentFixtureIds.users.owner, () =>
      prisma.client().catalogProduct.findMany(),
    );
    expect(products).toEqual([]);
  });

  it('prevents cross-tenant reads in both directions', async () => {
    const alphaOrders = await prisma.withTenantContext(alphaContext, () =>
      prisma.client().order.findMany(),
    );
    const betaOrders = await prisma.withTenantContext(betaContext, () =>
      prisma.client().order.findMany(),
    );
    expect(
      alphaOrders.every(({ tenantId }) => tenantId === developmentFixtureIds.tenants.alpha),
    ).toBe(true);
    expect(
      betaOrders.every(({ tenantId }) => tenantId === developmentFixtureIds.tenants.beta),
    ).toBe(true);
  });
});

async function resetAdminMembership() {
  await prisma.tenantMembership.update({
    where: { id: developmentFixtureIds.memberships.alphaAdmin },
    data: {
      role: MembershipRole.ADMIN,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
      revokedAt: null,
      revokedById: null,
      updatedById: developmentFixtureIds.users.owner,
    },
  });
  await prisma.auditLog.deleteMany({
    where: { entityId: developmentFixtureIds.memberships.alphaAdmin },
  });
}

function context(
  membership: { id: string; tenantId: string; role: MembershipRole; tenant: { slug: string } },
  userId: string,
  email: string,
): RequestAuthentication {
  return {
    user: { id: userId, email, displayName: email.split('@')[0] },
    tenant: {
      membershipId: membership.id,
      tenantId: membership.tenantId,
      tenantSlug: membership.tenant.slug,
      role: membership.role,
    },
  };
}
