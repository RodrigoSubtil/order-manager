import { describe, expect, it } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { formValuesToOrderForm, orderToFormValues } from './orderFormMappers';

const order: Order = {
  id: 'order-1',
  orderNumber: 10,
  clientName: 'Ana Silva',
  phone: '',
  responsibleId: 'responsible-1',
  responsibleName: 'Maria',
  deliveryDate: '2026-07-20',
  deliveryTime: '',
  products: [
    {
      id: 'item-1',
      category: 'Pastelaria',
      product: 'Bolo',
      quantity: '1,5 kg',
      notes: '',
    },
  ],
  createdAt: '2026-07-17T10:00:00.000Z',
};

describe('orderFormMappers', () => {
  it('uses a number-input-compatible decimal while editing', () => {
    const values = orderToFormValues(order);

    expect(values.items[0]?.quantityAmount).toBe('1.5');
    expect(values.items[0]?.quantityUnit).toBe('KG');
  });

  it('converts form quantities to the presentation-domain format', () => {
    const values = orderToFormValues(order);

    expect(formValuesToOrderForm(values).products[0]?.quantity).toBe('1.5 kg');
  });
});
