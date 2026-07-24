import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { listAllOrders } from '../../../shared/lib/supabaseData';
import { usePrintOrders } from './usePrintOrders';

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
