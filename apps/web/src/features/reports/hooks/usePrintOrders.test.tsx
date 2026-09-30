import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { todayKey } from '../../../shared/lib/dateUtils';
import { listAllOrders } from '../../../shared/lib/supabaseData';
import { preparePrintFrame } from '../lib/preparePrintFrame';
import { filterOrdersByCategory, filterOrdersByDateTime, usePrintOrders } from './usePrintOrders';

vi.mock('../../../shared/lib/supabaseData', () => ({
  listAllOrders: vi.fn(),
}));
vi.mock('../lib/preparePrintFrame', () => ({
  preparePrintFrame: vi.fn(async () => {
    const frame = document.createElement('iframe');
    frame.dataset.printFrame = 'true';
    document.body.appendChild(frame);
    frame.contentWindow!.print = window.print;
    return frame;
  }),
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

describe('filterOrdersByCategory', () => {
  it('mantém somente os produtos da categoria escolhida', () => {
    const lunchItem = {
      id: 'item-2',
      category: 'Almoço' as const,
      product: 'Arroz e Feijão',
      quantity: '2 un',
      notes: '',
    };

    expect(
      filterOrdersByCategory([{ ...order, products: [...order.products, lunchItem] }], 'Almoço'),
    ).toEqual([{ ...order, products: [lunchItem] }]);
    expect(filterOrdersByCategory([order], 'Almoço')).toEqual([]);
    expect(filterOrdersByCategory([order], 'Todas')).toEqual([order]);
  });
});

describe('usePrintOrders', () => {
  let queryClient: QueryClient;
  let printRoot: HTMLElement;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(listAllOrders).mockResolvedValue([order]);
    printRoot = document.createElement('section');
    printRoot.dataset.printRoot = '';
    const card = document.createElement('article');
    card.dataset.printCard = '';
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      height: 200,
    } as DOMRect);
    printRoot.appendChild(card);
    document.body.appendChild(printRoot);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    printRoot.remove();
    document.querySelectorAll('[data-print-frame]').forEach((frame) => frame.remove());
    queryClient.clear();
  });

  it('abre com as duas datas de hoje mesmo quando o painel filtra outra data', () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePrintOrders([], '2026-07-24', 'Todas'), { wrapper });

    act(() => result.current.openPrintOptions());

    expect(result.current.printFrom).toBe(todayKey());
    expect(result.current.printUntil).toBe(todayKey());
    expect(result.current.printFromTime).toBe('00:00');
    expect(result.current.printUntilTime).toBe('23:59');

    act(() => {
      result.current.setPrintFrom('2026-07-24');
      result.current.setPrintUntil('2026-07-26');
    });
    expect(result.current.printRangeMode).toBe('period');

    act(() => result.current.openPrintOptions());
    expect(result.current.printFrom).toBe(todayKey());
    expect(result.current.printUntil).toBe(todayKey());
  });

  it('mantém os produtos durante a prévia e limpa-os só quando ela fecha', async () => {
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
    expect(result.current.printOrders).toHaveLength(1);
    expect(preparePrintFrame).toHaveBeenCalledWith(printRoot);
    expect(document.querySelector('[data-print-frame]')).not.toBeNull();

    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(result.current.printOrders).toHaveLength(0);
    expect(document.querySelector('[data-print-frame]')).not.toBeNull();
  });

  it('não abre uma impressão vazia quando a encomenda deixa de existir no servidor', async () => {
    vi.mocked(listAllOrders).mockResolvedValue([]);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePrintOrders([order], order.deliveryDate, 'Todas'), {
      wrapper,
    });
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    act(() => result.current.startPrint(order.id));

    await waitFor(() => expect(result.current.printError).toContain('Nenhuma encomenda'));
    expect(printSpy).not.toHaveBeenCalled();
  });
});
