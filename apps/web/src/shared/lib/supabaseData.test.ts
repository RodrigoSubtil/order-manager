import { describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());

vi.mock('./supabase', () => ({
  supabase: { rpc },
}));

import { listAllOrders, SupabaseRpcError, unlockManagementAccess } from './supabaseData';

function page(page: number, total: number, id: string) {
  return {
    data: {
      items: [
        {
          id,
          orderNumber: page,
          clientName: `Cliente ${page}`,
          phone: null,
          responsibleId: null,
          responsibleName: null,
          deliveryDate: '2026-07-23',
          deliveryTime: null,
          version: 1,
          createdAt: '2026-07-23T10:00:00.000Z',
          items: [],
        },
      ],
      page,
      pageSize: 100,
      total,
    },
    error: null,
  };
}

describe('Supabase data adapter', () => {
  it('loads every database page before printing', async () => {
    rpc.mockReset();
    rpc.mockResolvedValueOnce(page(1, 201, 'one'));
    rpc.mockResolvedValueOnce(page(2, 201, 'two'));
    rpc.mockResolvedValueOnce(page(3, 201, 'three'));

    const orders = await listAllOrders({ from: '2026-07-23', until: '2026-07-23' });

    expect(orders.map((order) => order.id)).toEqual(['one', 'two', 'three']);
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      'web_list_orders',
      expect.objectContaining({ p_page: 1, p_page_size: 100 }),
    );
  });

  it('preserves an optimistic-lock conflict from PostgreSQL', async () => {
    rpc.mockReset();
    rpc.mockResolvedValue({
      data: null,
      error: { code: '40001', message: 'order was changed by another user' },
    });

    await expect(listAllOrders({ from: '2026-07-23', until: '2026-07-23' })).rejects.toMatchObject({
      code: '40001',
      status: 409,
    } satisfies Partial<SupabaseRpcError>);
  });

  it('does not treat an incorrect management password as an unlocked response', async () => {
    rpc.mockReset();
    rpc.mockResolvedValue({
      data: {
        configured: true,
        unlocked: false,
        unlockedUntil: null,
        error: 'Senha de gerenciamento incorreta.',
      },
      error: null,
    });

    await expect(unlockManagementAccess('incorreta')).rejects.toThrow(
      'Senha de gerenciamento incorreta.',
    );
  });
});
