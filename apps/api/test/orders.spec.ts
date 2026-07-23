import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { MembershipRole, ProductCategory, QuantityUnit } from '../src/generated/prisma/client';
import { OrdersService } from '../src/orders/orders.service';
import { OrderStatusFilter } from '../src/orders/dto/list-orders-query.dto';

const context = {
  user: { id: 'user-a', email: 'a@example.test', displayName: 'Operator' },
  tenant: {
    membershipId: 'membership-a',
    tenantId: 'tenant-a',
    tenantSlug: 'alpha',
    role: MembershipRole.OPERATOR,
  },
};
const item = {
  category: ProductCategory.PASTELARIA,
  productName: 'Pastel',
  quantityValue: '12',
  quantityUnit: QuantityUnit.UN,
};

describe('OrdersService safety guarantees', () => {
  it('always scopes list queries to the authenticated tenant', async () => {
    const repository = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const service = new OrdersService({} as never, repository as never, {} as never);

    await service.list(context, { page: 1, pageSize: 25, status: OrderStatusFilter.ACTIVE });

    expect(repository.findMany).toHaveBeenCalledWith('tenant-a', expect.any(Object));
    expect(repository.count).toHaveBeenCalledWith('tenant-a', expect.any(Object));
  });

  it('does not reveal an order from a different tenant', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null) };
    const service = new OrdersService({} as never, repository as never, {} as never);

    await expect(service.get(context, 'order-from-tenant-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findById).toHaveBeenCalledWith('tenant-a', 'order-from-tenant-b');
  });

  it('rejects concurrent update when the expected version no longer matches', async () => {
    const transaction = { order: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    const prisma = {
      withTransaction: (operation: (tx: object) => unknown) => operation(transaction),
    };
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'order-a' }),
      createItems: jest.fn(),
    };
    const audit = { record: jest.fn() };
    const service = new OrdersService(prisma as never, repository as never, audit as never);

    await expect(
      service.update(context, 'order-a', { version: 1, clientName: 'Novo' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createItems).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('does not write an audit entry when item insertion fails inside order creation transaction', async () => {
    const transaction = {
      responsible: { findFirst: jest.fn() },
      catalogProduct: { findFirst: jest.fn() },
      order: { create: jest.fn().mockResolvedValue({ id: 'order-a' }) },
    };
    const prisma = {
      reserveOrderNumber: (_tenantId: string, operation: (tx: object, number: bigint) => unknown) =>
        operation(transaction, BigInt(1)),
    };
    const repository = {
      createItems: jest.fn().mockRejectedValue(new Error('item insert failed')),
    };
    const audit = { record: jest.fn() };
    const service = new OrdersService(prisma as never, repository as never, audit as never);

    await expect(
      service.create(context, { clientName: 'Cliente', deliveryDate: '2026-07-16', items: [item] }),
    ).rejects.toThrow('item insert failed');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects confirmation endpoint when bulk deletion was not explicitly confirmed', async () => {
    const service = new OrdersService({} as never, {} as never, {} as never);
    await expect(
      service.confirmBulkDelete(context, { until: '2026-07-16', confirmation: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
