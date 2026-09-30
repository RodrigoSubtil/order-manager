import { describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());

vi.mock('./supabase', () => ({
  supabase: { rpc },
}));

import {
  listAllOrders,
  listCatalogProducts,
  saveOrder,
  searchCustomers,
  saveCatalogProduct,
  SupabaseRpcError,
  unlockManagementAccess,
} from './supabaseData';

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
  it('passes the selected customer and retry key to the server, and searches remotely', async () => {
    rpc.mockReset();
    rpc.mockResolvedValueOnce({
      data: [{ id: 'customer-1', name: 'Ana', phone: '912345678', version: 1 }],
      error: null,
    });
    expect(await searchCustomers('An')).toEqual([
      { id: 'customer-1', name: 'Ana', phone: '912345678', version: 1 },
    ]);
    expect(rpc).toHaveBeenCalledWith('web_search_customers', { p_query: 'An' });

    rpc.mockResolvedValueOnce({ data: { id: 'order-1', version: 1 }, error: null });
    await saveOrder(
      {
        orderNumber: null,
        customerId: 'customer-1',
        clientName: 'Ana',
        phone: '912345678',
        responsibleId: 'responsible-1',
        responsibleName: 'Maria',
        deliveryDate: '2026-09-20',
        deliveryTime: '08:00',
        products: [],
      },
      'retry-1',
    );
    expect(rpc).toHaveBeenCalledWith('web_save_order_with_responsible', {
      p_order: expect.objectContaining({
        customerId: 'customer-1',
        responsibleName: 'Maria',
        requestId: 'retry-1',
      }),
    });
  });
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

  it('preserva itens e observações do banco e apresenta quantidades numéricas sem zeros finais', async () => {
    rpc.mockReset();
    const response = page(1, 1, 'order-1');
    rpc.mockResolvedValueOnce({
      ...response,
      data: {
        ...response.data,
        items: [
          {
            ...response.data.items[0],
            items: [
              {
                id: 'item-1',
                category: 'PASTELARIA',
                productName: 'Bolo de chocolate',
                quantityValue: '1.500',
                quantityUnit: 'KG',
                notes: 'Decoração azul',
                position: 0,
              },
              {
                id: 'item-2',
                category: 'PASTELARIA',
                productName: 'Bola de Berlim',
                quantityValue: '50.000',
                quantityUnit: 'UN',
                notes: null,
                position: 1,
              },
            ],
          },
        ],
      },
    });

    const orders = await listAllOrders({ from: '2026-07-23', until: '2026-07-23' });

    expect(orders[0].products).toEqual([
      {
        id: 'item-1',
        category: 'Pastelaria',
        product: 'Bolo de chocolate',
        quantity: '1.5 kg',
        notes: 'Decoração azul',
      },
      {
        id: 'item-2',
        category: 'Pastelaria',
        product: 'Bola de Berlim',
        quantity: '50 un',
        notes: '',
      },
    ]);
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

  it('keeps the product catalog independent from order-item units', async () => {
    rpc.mockReset();
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'product-1',
          category: 'PADARIA',
          name: 'Baguete',
          version: 1,
        },
      ],
      error: null,
    });

    const catalog = await listCatalogProducts();

    expect(catalog).toEqual([
      {
        id: 'product-1',
        category: 'Padaria',
        name: 'Baguete',
        version: 1,
      },
    ]);

    rpc.mockResolvedValueOnce({
      data: {
        id: 'product-1',
        category: 'PADARIA',
        name: 'Baguete',
        version: 2,
      },
      error: null,
    });

    await saveCatalogProduct({
      id: 'product-1',
      category: 'Padaria',
      name: 'Baguete',
      version: 1,
    });

    expect(rpc).toHaveBeenLastCalledWith('web_save_catalog_product', {
      p_product: {
        id: 'product-1',
        version: 1,
        category: 'PADARIA',
        name: 'Baguete',
      },
    });
  });
});
