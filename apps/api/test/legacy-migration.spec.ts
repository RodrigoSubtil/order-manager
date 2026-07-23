import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { analyzeLegacyExport } from '../prisma/legacy/analyze';
import { parseLegacyQuantity } from '../prisma/legacy/quantity';
import type { LegacyExport } from '../prisma/legacy/types';

describe('legacy migration characterization', () => {
  it.each([
    ['12', '12', 'UN'],
    ['2 unidades', '2', 'UN'],
    ['1,5 kg', '1.5', 'KG'],
    ['500 gramas', '500', 'G'],
  ])('converts %s into %s %s', (raw, value, unit) => {
    expect(parseLegacyQuantity(raw)).toEqual({ ok: true, value, unit });
  });

  it.each(['', '0 un', '-1 kg', 'doze caixas', '1 litro', '1,2345 kg'])(
    'rejects quantity %s without silently guessing',
    (raw) => {
      expect(parseLegacyQuantity(raw).ok).toBe(false);
    },
  );

  it('accepts the complete synthetic export and records deterministic rekeying', () => {
    const analysis = analyzeLegacyExport(loadFixture());

    expect(analysis.metadataConfirmed).toBe(true);
    expect(blockingCodes(analysis)).toEqual([]);
    expect(analysis.sourceCounts).toEqual({
      appUsers: 2,
      orders: 2,
      orderItems: 4,
      responsibles: 2,
      catalogProducts: 3,
    });
    expect(analysis.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ID_REKEYED',
          sourceId: 'legacy-item-4',
          severity: 'WARNING',
        }),
      ]),
    );
  });

  it('blocks duplicates, invalid quantities, orphans and orders without items', () => {
    const fixture = loadFixture();
    const firstOrder = fixture.data.orders[0]!;
    const secondOrder = fixture.data.orders[1]!;
    const firstItem = fixture.data.orderProducts[0]!;

    secondOrder.orderNumber = firstOrder.orderNumber;
    firstOrder.responsibleId = '99999999-0000-4000-8000-000000000099';
    firstItem.quantity = 'doze caixas';
    fixture.data.orderProducts = fixture.data.orderProducts.filter(
      (item) => item.orderId !== secondOrder.id,
    );
    fixture.data.orderProducts.push({
      ...firstItem,
      id: 'orphan-item',
      orderId: '99999999-0000-4000-8000-000000000098',
    });

    expect(blockingCodes(analyzeLegacyExport(fixture))).toEqual(
      expect.arrayContaining([
        'ORDER_NUMBER_DUPLICATE',
        'QUANTITY_UNCONVERTIBLE',
        'ORDER_PRODUCT_ORPHAN',
        'RESPONSIBLE_ORPHAN',
        'ORDER_WITHOUT_ITEMS',
      ]),
    );
  });

  it('blocks incomplete schema metadata and unmapped app users', () => {
    const fixture = loadFixture();
    fixture.schema.tables = fixture.schema.tables.filter(
      (table) => table.name !== 'order_products',
    );
    fixture.migration.userMappings.pop();

    expect(blockingCodes(analyzeLegacyExport(fixture))).toEqual(
      expect.arrayContaining(['SCHEMA_TABLE_MISSING', 'APP_USER_UNMAPPED']),
    );
  });

  it('blocks a responsible linked to an order from another legacy user', () => {
    const fixture = loadFixture();
    fixture.data.orders[0]!.responsibleId = fixture.data.orderResponsibles[1]!.id;

    expect(blockingCodes(analyzeLegacyExport(fixture))).toContain('RESPONSIBLE_APP_USER_MISMATCH');
  });

  it('blocks merging different legacy bakeries into one tenant', () => {
    const fixture = loadFixture();
    fixture.data.appUsers[1]!.bakeryName = 'Outra Padaria';

    expect(blockingCodes(analyzeLegacyExport(fixture))).toContain(
      'MULTIPLE_BAKERIES_IN_SINGLE_TENANT',
    );
  });
});

function loadFixture(): LegacyExport {
  return JSON.parse(
    readFileSync(resolve(__dirname, '../prisma/legacy/fixtures/legacy-export.valid.json'), 'utf8'),
  ) as LegacyExport;
}

function blockingCodes(analysis: ReturnType<typeof analyzeLegacyExport>): string[] {
  return analysis.issues
    .filter((issue) => issue.severity === 'BLOCKING')
    .map((issue) => issue.code);
}
