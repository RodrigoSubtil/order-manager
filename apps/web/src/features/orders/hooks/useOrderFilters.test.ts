import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { todayKey } from '../../../shared/lib/dateUtils';
import type { Order } from '../../../shared/lib/domain';
import { compareOrdersByDelivery, getOrderStats, useOrderFilterState } from './useOrderFilters';

function order(overrides: Partial<Order>): Order {
  return {
    id: 'order',
    orderNumber: 1,
    clientName: 'Cliente',
    phone: '912345678',
    responsibleId: 'responsible',
    responsibleName: 'Maria',
    deliveryDate: '2026-07-24',
    deliveryTime: '10:00',
    products: [],
    createdAt: '2026-07-24T09:00:00Z',
    version: 1,
    ...overrides,
  };
}

describe('compareOrdersByDelivery', () => {
  it('orders by delivery date, time and order number instead of edit time', () => {
    const orders = [
      order({ id: 'late', orderNumber: 4, deliveryTime: '15:00' }),
      order({ id: 'same-second', orderNumber: 3, deliveryTime: '10:00' }),
      order({ id: 'same-first', orderNumber: 2, deliveryTime: '10:00' }),
      order({ id: 'tomorrow', orderNumber: 1, deliveryDate: '2026-07-25', deliveryTime: '08:00' }),
    ];

    expect(orders.sort(compareOrdersByDelivery).map((item) => item.id)).toEqual([
      'same-first',
      'same-second',
      'late',
      'tomorrow',
    ]);
  });
});

describe('getOrderStats', () => {
  it('counts the complete unfiltered collection passed to the indicators', () => {
    const overviewOrders = [
      order({ id: 'today', deliveryDate: '2026-07-24' }),
      order({ id: 'tomorrow', deliveryDate: '2026-07-25' }),
      order({ id: 'later', deliveryDate: '2026-07-30' }),
    ];

    expect(getOrderStats(overviewOrders, '2026-07-24')).toEqual({
      today: 1,
      upcoming: 2,
    });
  });
});

describe('useOrderFilterState', () => {
  it('switches among all, today and a previously selected custom date', () => {
    const { result } = renderHook(() => useOrderFilterState());
    expect(result.current.dateFilterMode).toBe('today');
    expect(result.current.dateFilter).toBe(todayKey());

    act(() => result.current.setDateFilterMode('custom'));
    act(() => result.current.setDateFilter('2026-01-15'));
    expect(result.current.queryParams).toMatchObject({
      from: '2026-01-15',
      until: '2026-01-15',
    });

    act(() => result.current.setDateFilterMode('all'));
    expect(result.current.dateFilter).toBe('');
    expect(result.current.queryParams.from).toBeUndefined();

    act(() => result.current.setDateFilterMode('custom'));
    expect(result.current.dateFilter).toBe('2026-01-15');

    act(() => result.current.setDateFilterMode('today'));
    expect(result.current.dateFilter).toBe(todayKey());
  });
});
