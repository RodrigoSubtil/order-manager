import { afterEach, describe, expect, it, vi } from 'vitest';

import { todayKey, yesterdayKey } from '../../../shared/lib/dateUtils';
import { orderSchema, type OrderFormValues } from './orderSchema';

function tomorrowKey() {
  const [year, month, day] = todayKey().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function validOrder(overrides: Partial<OrderFormValues> = {}): OrderFormValues {
  return {
    orderNumber: null,
    clientName: 'Ana Silva',
    phoneCountryCode: '351',
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
    ['phone', { phone: '912abc678' }],
    ['phoneCountryCode', { phoneCountryCode: '' }],
    ['responsibleName', { responsibleName: '' }],
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

  it('accepts a new responsible typed into the order', () => {
    expect(
      orderSchema.safeParse(validOrder({ responsibleId: '', responsibleName: 'Maria Silva' }))
        .success,
    ).toBe(true);
  });

  it('only accepts new half-hour delivery times but preserves an unchanged older time', () => {
    expect(orderSchema.safeParse(validOrder({ deliveryTime: '10:15' })).success).toBe(false);
    expect(
      orderSchema.safeParse(
        validOrder({
          deliveryTime: '10:15',
          originalDeliveryDate: tomorrowKey(),
          originalDeliveryTime: '10:15',
        }),
      ).success,
    ).toBe(true);
  });

  it('requires at least one item', () => {
    const result = orderSchema.safeParse(validOrder({ items: [] }));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['items']);
  });

  it('accepts a Brazilian number with DDD and rejects an oversized complete number', () => {
    expect(
      orderSchema.safeParse(validOrder({ phoneCountryCode: '55', phone: '11999999999' })).success,
    ).toBe(true);
    const result = orderSchema.safeParse(
      validOrder({ phoneCountryCode: '351', phone: '91234567812345' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'phone')).toBe(true);
    }
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
    vi.setSystemTime(new Date('2026-07-26T13:30:00Z'));

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
    vi.setSystemTime(new Date('2026-07-26T13:30:00Z'));

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
    ['07:59', false],
    ['08:00', true],
    ['21:00', true],
    ['21:01', false],
  ])('validates delivery at %s within the business window', (deliveryTime, expected) => {
    expect(orderSchema.safeParse(validOrder({ deliveryTime })).success).toBe(expected);
  });

  it('allows editing other fields of an old order without rescheduling', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T13:30:00Z'));
    expect(
      orderSchema.safeParse(
        validOrder({
          deliveryDate: '2026-07-25',
          deliveryTime: '07:00',
          originalDeliveryDate: '2026-07-25',
          originalDeliveryTime: '07:00',
        }),
      ).success,
    ).toBe(true);
    expect(
      orderSchema.safeParse(
        validOrder({
          deliveryDate: '2026-07-25',
          deliveryTime: '08:00',
          originalDeliveryDate: '2026-07-25',
          originalDeliveryTime: '07:00',
        }),
      ).success,
    ).toBe(false);
  });

  it('uses Lisbon day and clock through daylight-saving changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T23:30:00Z'));
    expect(todayKey()).toBe('2026-07-27');
    vi.setSystemTime(new Date('2026-12-26T23:30:00Z'));
    expect(todayKey()).toBe('2026-12-26');
  });

  it.each([
    ['product', ''],
    ['quantityAmount', '0'],
    ['quantityAmount', '0.5'],
    ['quantityAmount', '-1'],
    ['quantityAmount', '1001'],
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
