import { describe, expect, it } from 'vitest';

import type { Order, ProductLine } from './domain';
import { buildPrintProductSummary, groupProducts } from './productGrouping';
import {
  getQuantityAmount,
  getQuantityUnit,
  joinQuantity,
  normalizeQuantityUnit,
  parseQuantity,
} from './quantityUtils';

function product(overrides: Partial<ProductLine> = {}): ProductLine {
  return {
    id: 'product-1',
    category: 'Pastelaria',
    product: 'Bolo de chocolate',
    quantity: '1 un',
    notes: '',
    ...overrides,
  };
}

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 1,
    clientName: 'Ana Silva',
    phone: '912345678',
    responsibleId: 'responsible-1',
    responsibleName: 'Maria',
    deliveryDate: '2026-07-20',
    deliveryTime: '10:00',
    products: [product()],
    createdAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('quantity utilities', () => {
  it('normalizes common units and parses decimal quantities', () => {
    expect(normalizeQuantityUnit(' Quilos ')).toBe('kg');
    expect(parseQuantity('1,5 quilos')).toEqual({ amount: 1.5, unit: 'kg', raw: '1,5 quilos' });
    expect(parseQuantity('caixa')).toEqual({ amount: 1, unit: 'unidade', raw: 'caixa' });
    expect(parseQuantity('')).toEqual({ amount: 0, unit: 'unidade', raw: '' });
  });

  it('splits and joins the quantity fields used by the form', () => {
    expect(getQuantityAmount('1.5 kg')).toBe('1,5');
    expect(getQuantityUnit('1.5 kg')).toBe('kg');
    expect(joinQuantity('2,5', 'unidades')).toBe('2.5 un');
    expect(joinQuantity('', 'kg')).toBe('');
  });
});

describe('product grouping and production summary', () => {
  it('groups product lines by the fixed category order', () => {
    const groups = groupProducts([
      product({ id: '1', category: 'Salgados', product: 'Croquete' }),
      product({ id: '2', category: 'Pastelaria', product: 'Bolo' }),
    ]);
    expect(groups.map((group) => group.category)).toEqual(['Pastelaria', 'Salgados']);
    expect(groups[0].products).toHaveLength(1);
    expect(groups[1].products[0].product).toBe('Croquete');
  });

  it('sums unit quantities and keeps non-unit quantities as separate order counts', () => {
    const summary = buildPrintProductSummary([
      order({
        products: [
          product({ quantity: '2 un' }),
          product({ id: 'kg-1', product: 'Pao', quantity: '1 kg' }),
        ],
      }),
      order({
        id: 'order-2',
        products: [
          product({ id: 'product-2', quantity: '3 un' }),
          product({ id: 'kg-2', product: 'Pao', quantity: '1 kg' }),
        ],
      }),
    ]);
    expect(summary).toEqual([
      {
        category: 'Pastelaria',
        products: [
          expect.objectContaining({ product: 'Bolo de chocolate', displayQuantity: '5 un' }),
          expect.objectContaining({ product: 'Pao', displayQuantity: '2 pedidos x 1 kg' }),
        ],
      },
    ]);
  });
});
