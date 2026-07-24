import { beforeEach, describe, expect, it } from 'vitest';

import {
  filterContingencyOrders,
  paginateContingencyOrders,
  readCachedSessionContext,
  readContingencySnapshot,
  saveCachedSessionContext,
  saveContingencySnapshot,
  shouldPreserveContingencySnapshot,
  type ContingencySnapshot,
} from './contingencyStore';
import type { Order } from './domain';

const orders: Order[] = [
  {
    id: 'later',
    orderNumber: 2,
    clientName: 'Ana Silva',
    phone: '912345678',
    responsibleId: 'maria',
    responsibleName: 'Maria Helena',
    deliveryDate: '2026-07-25',
    deliveryTime: '15:00',
    products: [
      {
        id: 'item-2',
        category: 'Pastelaria',
        product: 'Bolo de Chocolate',
        quantity: '1 un',
        notes: 'Sem açúcar',
      },
    ],
    createdAt: '2026-07-24T10:00:00Z',
    version: 1,
  },
  {
    id: 'earlier',
    orderNumber: 1,
    clientName: 'Café Jardim',
    phone: '912345679',
    responsibleId: 'david',
    responsibleName: 'David',
    deliveryDate: '2026-07-24',
    deliveryTime: '10:00',
    products: [
      {
        id: 'item-1',
        category: 'Padaria',
        product: 'Baguete',
        quantity: '12 un',
        notes: '',
      },
    ],
    createdAt: '2026-07-24T09:00:00Z',
    version: 1,
  },
];

describe('contingencyStore', () => {
  beforeEach(() => window.localStorage.clear());

  it('stores an isolated snapshot for the tenant', () => {
    const snapshot: ContingencySnapshot = {
      version: 1,
      tenantId: 'tenant-1',
      savedAt: '2026-07-24T12:00:00Z',
      orders,
      catalogProducts: [],
      responsibles: [],
    };

    saveContingencySnapshot(snapshot);

    expect(readContingencySnapshot('tenant-1')).toEqual(snapshot);
    expect(readContingencySnapshot('tenant-2')).toBeNull();
  });

  it('stores only a validated session context for offline identification', () => {
    const context = {
      user: {
        id: 'user-1',
        username: 'Pastelaria Vénus',
        displayName: 'Pastelaria Vénus',
      },
      tenant: {
        id: 'tenant-1',
        name: 'Pastelaria Vénus',
        slug: 'pastelaria-venus',
      },
      role: 'OWNER' as const,
    };

    saveCachedSessionContext(context);

    expect(readCachedSessionContext('user-1')).toEqual(context);
    expect(readCachedSessionContext('other-user')).toBeNull();
  });

  it('filters every search term and keeps delivery order', () => {
    expect(
      filterContingencyOrders(orders, { search: 'ana chocolate' }).map(({ id }) => id),
    ).toEqual(['later']);
    expect(filterContingencyOrders(orders, {}).map(({ id }) => id)).toEqual(['earlier', 'later']);
  });

  it('paginates the cached result instead of moving a recent edit to page one', () => {
    const page = paginateContingencyOrders(orders, { page: 2, pageSize: 1 });

    expect(page.items.map(({ id }) => id)).toEqual(['later']);
    expect(page.total).toBe(2);
  });

  it('preserves existing cached orders when the server unexpectedly returns zero', () => {
    const previous: ContingencySnapshot = {
      version: 1,
      tenantId: 'tenant-1',
      savedAt: '2026-07-24T12:00:00Z',
      orders,
      catalogProducts: [],
      responsibles: [],
    };

    expect(shouldPreserveContingencySnapshot(previous, [])).toBe(true);
    expect(shouldPreserveContingencySnapshot(previous, orders)).toBe(false);
    expect(shouldPreserveContingencySnapshot({ ...previous, orders: [] }, [])).toBe(false);
    expect(shouldPreserveContingencySnapshot(null, [])).toBe(false);
  });
});
