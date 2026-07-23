import { describe, expect, it } from 'vitest';

import { orderSchema, type OrderFormValues } from './orderSchema';

function validOrder(overrides: Partial<OrderFormValues> = {}): OrderFormValues {
  return {
    orderNumber: null,
    clientName: 'Ana Silva',
    phone: '912345678',
    responsibleId: 'responsible-1',
    responsibleName: 'Maria',
    deliveryDate: '2026-07-20',
    deliveryTime: '10:30',
    items: [
      {
        id: 'item-1',
        category: 'Pastelaria',
        product: 'Bolo de chocolate',
        quantityAmount: '1,5',
        quantityUnit: 'KG',
        notes: '',
      },
    ],
    ...overrides,
  };
}

describe('orderSchema', () => {
  it('accepts an empty optional phone and time', () => {
    expect(orderSchema.safeParse(validOrder({ phone: '', deliveryTime: '' })).success).toBe(true);
  });

  it.each([
    ['clientName', { clientName: '' }],
    ['phone', { phone: '123' }],
    ['responsibleId', { responsibleId: '' }],
    ['deliveryDate', { deliveryDate: '2026-02-30' }],
    ['deliveryTime', { deliveryTime: '25:10' }],
  ] satisfies Array<[keyof OrderFormValues, Partial<OrderFormValues>]>)(
    'rejects an invalid %s',
    (field, overrides) => {
      const result = orderSchema.safeParse(validOrder(overrides));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
      }
    },
  );

  it('requires at least one item', () => {
    const result = orderSchema.safeParse(validOrder({ items: [] }));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['items']);
  });

  it.each([
    ['product', ''],
    ['quantityAmount', '0'],
    ['quantityAmount', '-1'],
  ] as const)('rejects an item with invalid %s', (field, value) => {
    const order = validOrder();
    const result = orderSchema.safeParse({
      ...order,
      items: [{ ...order.items[0], [field]: value }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'items' && issue.path[2] === field),
      ).toBe(true);
    }
  });

  it.each(['UN', 'KG', 'G'] as const)('accepts the %s quantity unit', (quantityUnit) => {
    const order = validOrder();

    expect(
      orderSchema.safeParse({
        ...order,
        items: [{ ...order.items[0], quantityUnit }],
      }).success,
    ).toBe(true);
  });
});
