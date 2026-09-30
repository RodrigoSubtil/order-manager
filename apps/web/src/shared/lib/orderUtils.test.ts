import { describe, expect, it } from 'vitest';

import type { Order, ProductLine } from './domain';
import { buildPrintProductSummary, groupProducts } from './productGrouping';
import {
  getQuantityAmount,
  getQuantityUnit,
  joinQuantity,
  formatQuantityTotal,
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

  it('preserva as três casas decimais admitidas pelo banco nos totais', () => {
    expect(formatQuantityTotal(2.002, 'un')).toBe('2,002 un');
  });
});

describe('product grouping and production summary', () => {
  it('groups product lines by the fixed category order', () => {
    const groups = groupProducts([
      product({ id: '1', category: 'Salgados', product: 'Croquete' }),
      product({ id: '2', category: 'Pastelaria', product: 'Bolo' }),
      product({ id: '3', category: 'Almoço', product: 'Arroz e Feijão' }),
    ]);
    expect(groups.map((group) => group.category)).toEqual(['Pastelaria', 'Salgados', 'Almoço']);
    expect(groups[0].products).toHaveLength(1);
    expect(groups[1].products[0].product).toBe('Croquete');
  });

  it('soma unidades do mesmo produto e mantém cada item em kg ou g ligado ao pedido', () => {
    const summary = buildPrintProductSummary([
      order({
        products: [
          product({ product: 'Bola de Berlim', quantity: '2 un' }),
          product({ id: 'kg-1', quantity: '1 kg', notes: 'Decoração azul' }),
          product({ id: 'g-1', product: 'Pão', quantity: '500 g' }),
        ],
      }),
      order({
        id: 'order-2',
        orderNumber: 2,
        products: [
          product({ id: 'product-2', product: 'bola  de berlim', quantity: '3 un' }),
          product({ id: 'kg-2', quantity: '1 kg', notes: 'Decoração rosa' }),
          product({ id: 'g-2', product: 'Pão', quantity: '0,5 kg' }),
        ],
      }),
    ]);

    expect(summary).toHaveLength(1);
    expect(summary[0].products).toHaveLength(5);
    expect(summary[0].products).toContainEqual(
      expect.objectContaining({ product: 'Bola de Berlim', displayQuantity: '5 un' }),
    );
    expect(summary[0].products.filter((item) => item.product === 'Bolo de chocolate')).toEqual([
      expect.objectContaining({ displayQuantity: '1 kg', orderNumber: 1 }),
      expect.objectContaining({ displayQuantity: '1 kg', orderNumber: 2 }),
    ]);
    expect(summary[0].products.filter((item) => item.product === 'Pão')).toEqual([
      expect.objectContaining({ displayQuantity: '500 g', orderNumber: 1 }),
      expect.objectContaining({ displayQuantity: '0,5 kg', orderNumber: 2 }),
    ]);
  });
});
