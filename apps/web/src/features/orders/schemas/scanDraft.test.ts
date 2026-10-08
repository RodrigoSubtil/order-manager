import { describe, expect, it } from 'vitest';

import { todayKey } from '../../../shared/lib/dateUtils';
import { orderSchema } from './orderSchema';
import { scanDraftSchema, scanDraftToOrderValues, type ScanDraft } from './scanDraft';

function tomorrowKey() {
  const [year, month, day] = todayKey().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function draft(): ScanDraft {
  return {
    clientName: { value: 'Ana Silva', status: 'conferir' },
    phone: { value: '912345678', status: 'conferir' },
    responsibleName: { value: 'Maria', status: 'provavel' },
    deliveryDate: { value: tomorrowKey(), status: 'provavel' },
    deliveryTime: { value: '10:30', status: 'provavel' },
    items: [
      {
        id: 'item-1',
        category: 'Pastelaria',
        product: 'Bolo de chocolate',
        quantityAmount: '2',
        quantityUnit: 'KG',
        notes: '',
        status: 'provavel',
      },
    ],
  };
}

describe('rascunho de digitalização', () => {
  it('aceita apenas as duas situações combinadas e reutiliza a validação da encomenda', () => {
    const validDraft = draft();
    expect(scanDraftSchema.safeParse(validDraft).success).toBe(true);
    expect(orderSchema.safeParse(scanDraftToOrderValues(validDraft)).success).toBe(true);
    expect(
      scanDraftSchema.safeParse({ ...validDraft, phone: { value: '', status: 'confirmado' } })
        .success,
    ).toBe(false);
  });

  it('preserva uma encomenda com mais de cinco produtos sem impor limite próprio do scanner', () => {
    const manyItems = draft();
    manyItems.items = Array.from({ length: 12 }, (_, index) => ({
      ...manyItems.items[0],
      id: `item-${index}`,
    }));
    expect(scanDraftSchema.safeParse(manyItems).success).toBe(true);
    expect(orderSchema.safeParse(scanDraftToOrderValues(manyItems)).success).toBe(true);
  });

  it('não permite gravar dados obrigatórios por preencher', () => {
    const incomplete = draft();
    incomplete.responsibleName.value = '';
    expect(orderSchema.safeParse(scanDraftToOrderValues(incomplete)).success).toBe(false);
  });
});
