import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  filterContingencyOrders,
  readCachedSessionContext,
  readContingencySnapshot,
  saveCachedSessionContext,
  saveContingencySnapshot,
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

  it('accepts an empty successful snapshot as a valid business state', () => {
    const emptySnapshot: ContingencySnapshot = {
      version: 1,
      tenantId: 'tenant-1',
      savedAt: '2026-07-24T12:00:00Z',
      orders: [],
      catalogProducts: [],
      responsibles: [],
    };

    saveContingencySnapshot(emptySnapshot);

    expect(readContingencySnapshot('tenant-1')).toEqual(emptySnapshot);
  });

  it('does not fail the live flow when browser storage is full', () => {
    const snapshot: ContingencySnapshot = {
      version: 1,
      tenantId: 'tenant-1',
      savedAt: '2026-07-24T12:00:00Z',
      orders,
      catalogProducts: [],
      responsibles: [],
    };
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(saveContingencySnapshot(snapshot)).toBe(false);
    storageSpy.mockRestore();
  });
});
