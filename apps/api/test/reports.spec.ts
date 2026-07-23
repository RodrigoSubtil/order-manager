import { BadRequestException } from '@nestjs/common';

import { MembershipRole, ProductCategory, QuantityUnit } from '../src/generated/prisma/client';
import { ReportsService } from '../src/reports/reports.service';
import { buildProductionSummary } from '../src/reports/reports.utils';

const context = {
  user: { id: 'user-a', email: 'a@example.test', displayName: 'Operator' },
  tenant: {
    membershipId: 'membership-a',
    tenantId: 'tenant-a',
    tenantSlug: 'alpha',
    role: MembershipRole.OPERATOR,
  },
};

describe('production summary grouping', () => {
  it('sums only same category, product and unit without unit conversion', () => {
    expect(
      buildProductionSummary([
        {
          category: ProductCategory.PASTELARIA,
          productName: 'Pastel',
          quantityValue: '1.5',
          quantityUnit: QuantityUnit.KG,
        },
        {
          category: ProductCategory.PASTELARIA,
          productName: 'pastel',
          quantityValue: '0.25',
          quantityUnit: QuantityUnit.KG,
        },
        {
          category: ProductCategory.PASTELARIA,
          productName: 'Pastel',
          quantityValue: '500',
          quantityUnit: QuantityUnit.G,
        },
        {
          category: ProductCategory.PADARIA,
          productName: 'Pão',
          quantityValue: '3',
          quantityUnit: QuantityUnit.UN,
        },
      ]),
    ).toEqual([
      {
        category: ProductCategory.PASTELARIA,
        items: [
          {
            category: ProductCategory.PASTELARIA,
            productName: 'Pastel',
            quantityValue: '500',
            quantityUnit: QuantityUnit.G,
            orderCount: 1,
          },
          {
            category: ProductCategory.PASTELARIA,
            productName: 'Pastel',
            quantityValue: '1.75',
            quantityUnit: QuantityUnit.KG,
            orderCount: 2,
          },
        ],
      },
      {
        category: ProductCategory.PADARIA,
        items: [
          {
            category: ProductCategory.PADARIA,
            productName: 'Pão',
            quantityValue: '3',
            quantityUnit: QuantityUnit.UN,
            orderCount: 1,
          },
        ],
      },
    ]);
  });

  it('keeps decimal precision up to the persisted thousandths', () => {
    expect(
      buildProductionSummary([
        {
          category: ProductCategory.SALGADOS,
          productName: 'Croquete',
          quantityValue: '0.333',
          quantityUnit: QuantityUnit.KG,
        },
        {
          category: ProductCategory.SALGADOS,
          productName: 'Croquete',
          quantityValue: '0.667',
          quantityUnit: QuantityUnit.KG,
        },
      ])[0].items[0].quantityValue,
    ).toBe('1');
  });
});

describe('ReportsService', () => {
  it('uses the authenticated tenant when obtaining a detailed report', async () => {
    const repository = { findOrders: jest.fn().mockResolvedValue([]) };
    const service = new ReportsService(repository as never);

    const report = await service.detailed(context, { from: '2026-07-01', until: '2026-07-31' });

    expect(repository.findOrders).toHaveBeenCalledWith('tenant-a', expect.any(Object));
    expect(report).toEqual(
      expect.objectContaining({
        format: 'DETAILED',
        tenant: { id: 'tenant-a', slug: 'alpha' },
        orders: [],
      }),
    );
  });

  it('rejects an invalid period before querying data', async () => {
    const repository = { findOrders: jest.fn() };
    const service = new ReportsService(repository as never);

    await expect(
      service.productionSummary(context, { from: '2026-08-01', until: '2026-07-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findOrders).not.toHaveBeenCalled();
  });
});
