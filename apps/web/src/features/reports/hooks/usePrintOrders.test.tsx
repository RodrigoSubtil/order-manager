import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { listAllOrders } from '../../../shared/lib/supabaseData';
import { filterOrdersByDateTime, usePrintOrders } from './usePrintOrders';

vi.mock('../../../shared/lib/supabaseData', () => ({
  listAllOrders: vi.fn(),
}));

const order: Order = {
  id: 'order-1',
  orderNumber: 1,
  clientName: 'Ana Silva',
  phone: '912345678',
  responsibleId: 'responsible-1',
  responsibleName: 'Maria Helena',
  deliveryDate: '2026-07-24',
  deliveryTime: '10:30',
  products: [
    {
      id: 'item-1',
      category: 'Pastelaria',
      product: 'Pastel de Nata',
      quantity: '12 un',
      notes: '',
    },
  ],
  createdAt: '2026-07-24T09:00:00.000Z',
  version: 1,
};

describe('filterOrdersByDateTime', () => {
  const morningOrder = { ...order, id: 'morning', deliveryTime: '08:30' };
  const afternoonOrder = { ...order, id: 'afternoon', deliveryTime: '15:00' };
  const nextDayOrder = {
    ...order,
    id: 'next-day',
    deliveryDate: '2026-07-25',
    deliveryTime: '07:30',
  };

  it('limita as encomendas de um dia pelas horas inicial e final', () => {
    expect(
      filterOrdersByDateTime(
        [morningOrder, order, afternoonOrder],
        '2026-07-24',
        '09:00',
        '2026-07-24',
        '12:00',
      ),
    ).toEqual([order]);
  });

  it('aplica a hora inicial ao primeiro dia e a final ao último dia do período', () => {
    const middleDayOrder = {
      ...order,
      id: 'middle-day',
      deliveryDate: '2026-07-25',
      deliveryTime: '06:00',
    };
    const lastDayOrder = {
      ...order,
      id: 'last-day',
      deliveryDate: '2026-07-26',
      deliveryTime: '07:30',
    };
    expect(
      filterOrdersByDateTime(
        [morningOrder, afternoonOrder, nextDayOrder, middleDayOrder, lastDayOrder],
        '2026-07-24',
        '09:00',
        '2026-07-26',
        '07:00',
      ),
    ).toEqual([afternoonOrder, nextDayOrder, middleDayOrder]);
  });

  it('rejeita horários incompletos ou um intervalo invertido', () => {
    expect(filterOrdersByDateTime([morningOrder], '2026-07-24', '', '2026-07-24', '12:00')).toEqual(
      [],
    );
    expect(
      filterOrdersByDateTime([morningOrder], '2026-07-24', '15:00', '2026-07-24', '12:00'),
    ).toEqual([]);
  });
});

describe('usePrintOrders', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(listAllOrders).mockResolvedValue([order]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('mantém os produtos renderizados até o navegador abrir a impressão', async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePrintOrders([order], order.deliveryDate, 'Todas'), {
      wrapper,
    });
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
      expect(result.current.printOrders[0]?.products[0]?.product).toBe('Pastel de Nata');
    });

    act(() => result.current.startPrint(order.id));

    await waitFor(() => expect(printSpy).toHaveBeenCalledOnce());
  });
});
