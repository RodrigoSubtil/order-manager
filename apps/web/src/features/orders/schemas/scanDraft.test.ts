import { describe, expect, it } from 'vitest';

import { todayKey } from '../../../shared/lib/dateUtils';
import { orderSchema } from './orderSchema';
import {
  createBlankScanDraft,
  scanDraftSchema,
  scanDraftToOrderValues,
  type ScanDraft,
} from './scanDraft';

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
  it('deixa os dados ausentes para conferir e impede salvar o rascunho vazio', () => {
    const blank = createBlankScanDraft();
    expect(scanDraftSchema.safeParse(blank).success).toBe(true);
    expect(blank.clientName).toEqual({ value: '', status: 'conferir' });
    expect(blank.items[0]).toMatchObject({ product: '', status: 'conferir' });
    expect(blank.items[0].id).not.toBe(createBlankScanDraft().items[0].id);
    expect(orderSchema.safeParse(scanDraftToOrderValues(blank)).success).toBe(false);
  });

  it('não transforma categorias ou unidades desconhecidas em dados válidos', () => {
    const uncertain = draft();
    uncertain.items[0].category = 'Desconhecida';
    uncertain.items[0].quantityUnit = 'CAIXA';
    const values = scanDraftToOrderValues(uncertain);
    expect(values.items[0].category).toBe('');
    expect(values.items[0].quantityUnit).toBe('');
    expect(orderSchema.safeParse(values).success).toBe(false);
  });

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
