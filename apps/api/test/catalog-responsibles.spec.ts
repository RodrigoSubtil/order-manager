import { ConflictException, NotFoundException } from '@nestjs/common';
import { MembershipRole, ProductCategory, QuantityUnit } from '../src/generated/prisma/client';
import { CatalogService } from '../src/catalog/catalog.service';
import { ResponsiblesService } from '../src/responsibles/responsibles.service';

const context = {
  user: { id: 'user-a', email: 'owner@example.test', displayName: 'Owner' },
  tenant: {
    membershipId: 'membership-a',
    tenantId: 'tenant-a',
    tenantSlug: 'alpha',
    role: MembershipRole.OWNER,
  },
};

function transactionPrisma() {
  return { withTransaction: async (operation: (transaction: object) => unknown) => operation({}) };
}

describe('tenant-scoped catalog and responsibles services', () => {
  it('uses only the resolved tenant when listing catalog products', async () => {
    const repository = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const service = new CatalogService(
      transactionPrisma() as never,
      repository as never,
      {} as never,
    );

    await service.list(context, { page: 1, pageSize: 25, search: 'pastel' });

    expect(repository.findMany).toHaveBeenCalledWith('tenant-a', expect.any(Object));
    expect(repository.count).toHaveBeenCalledWith('tenant-a', expect.any(Object));
  });

  it('does not reveal a catalog product outside the current tenant', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null) };
    const service = new CatalogService(
      transactionPrisma() as never,
      repository as never,
      {} as never,
    );

    await expect(service.get(context, 'product-from-tenant-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findById).toHaveBeenCalledWith('tenant-a', 'product-from-tenant-b');
  });

  it('creates catalog product and its audit entry in one transaction', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({
        id: 'product-a',
        category: ProductCategory.PASTELARIA,
        isActive: true,
      }),
    };
    const audit = { record: jest.fn() };
    const service = new CatalogService(
      transactionPrisma() as never,
      repository as never,
      audit as never,
    );

    await service.create(
      context,
      { name: 'Pastel', category: ProductCategory.PASTELARIA, defaultUnit: QuantityUnit.UN },
      'request-id',
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.any(Object),
      'tenant-a',
      'user-a',
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ tenantId: 'tenant-a', actorUserId: 'user-a' }),
    );
  });

  it('rejects a stale responsible version without writing audit', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'responsible-a' }),
      update: jest.fn().mockResolvedValue({ count: 0 }),
    };
    const audit = { record: jest.fn() };
    const service = new ResponsiblesService(
      transactionPrisma() as never,
      repository as never,
      audit as never,
    );

    await expect(
      service.update(context, 'responsible-a', { version: 1, name: 'Maria' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).toHaveBeenCalledWith(
      expect.any(Object),
      'tenant-a',
      'responsible-a',
      'user-a',
      expect.any(Object),
    );
    expect(audit.record).not.toHaveBeenCalled();
  });
});
