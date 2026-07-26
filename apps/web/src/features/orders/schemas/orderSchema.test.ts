import { afterEach, describe, expect, it, vi } from 'vitest';

import { yesterdayKey } from '../../../shared/lib/dateUtils';
import { orderSchema, type OrderFormValues } from './orderSchema';

function tomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString('sv-SE');
}

function validOrder(overrides: Partial<OrderFormValues> = {}): OrderFormValues {
  return {
    orderNumber: null,
    clientName: 'Ana Silva',
    phone: '912345678',
    responsibleId: 'responsible-1',
    responsibleName: 'Maria',
    deliveryDate: tomorrowKey(),
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
  afterEach(() => vi.useRealTimers());

  it('accepts empty observations', () => {
    expect(orderSchema.safeParse(validOrder()).success).toBe(true);
  });

  it.each([
    ['clientName', { clientName: '' }],
    ['phone', { phone: '' }],
    ['phone', { phone: '123' }],
    ['responsibleId', { responsibleId: '' }],
    ['deliveryDate', { deliveryDate: '2026-02-30' }],
    ['deliveryTime', { deliveryTime: '' }],
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

  it('rejects a delivery date before today', () => {
    const result = orderSchema.safeParse(validOrder({ deliveryDate: yesterdayKey() }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'deliveryDate')).toBe(true);
    }
  });

  it('rejects a time before the current minute when delivery is today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 26, 14, 30));

    const result = orderSchema.safeParse(
      validOrder({ deliveryDate: '2026-07-26', deliveryTime: '14:29' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: 'A hora de entrega não pode ser anterior ao momento atual.',
          path: ['deliveryTime'],
        }),
      );
    }
  });

  it('accepts the current minute or a future time for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 26, 14, 30));

    expect(
      orderSchema.safeParse(validOrder({ deliveryDate: '2026-07-26', deliveryTime: '14:30' }))
        .success,
    ).toBe(true);
    expect(
      orderSchema.safeParse(validOrder({ deliveryDate: '2026-07-26', deliveryTime: '18:00' }))
        .success,
    ).toBe(true);
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
