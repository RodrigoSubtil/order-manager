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

  it('sends a typed responsible with capitalized initials and no selected id', () => {
    const values = orderToFormValues(order);
    values.responsibleId = '';
    values.responsibleName = '  mARia   da  sILVA ';

    expect(formValuesToOrderForm(values)).toMatchObject({
      responsibleId: '',
      responsibleName: 'Maria Da Silva',
    });
  });

  it('updates a selected customer only when its details were edited', () => {
    const values = orderToFormValues({
      ...order,
      customerId: '00000000-0000-4000-8000-000000000001',
      customerVersion: 3,
      phone: '351912345678',
    });
    expect(formValuesToOrderForm(values).updateCustomer).toBe(false);
    values.phone = '913000000';
    expect(formValuesToOrderForm(values)).toMatchObject({
      customerId: '00000000-0000-4000-8000-000000000001',
      customerVersion: 3,
      updateCustomer: true,
      phone: '351913000000',
    });
  });

  it('normalizes a selected legacy Portuguese customer on save', () => {
    const values = orderToFormValues({
      ...order,
      customerId: '00000000-0000-4000-8000-000000000001',
      customerVersion: 3,
      phone: '912345678',
    });

    expect(values.phoneCountryCode).toBe('351');
    expect(values.phone).toBe('912345678');
    expect(formValuesToOrderForm(values)).toMatchObject({
      phone: '351912345678',
      updateCustomer: true,
    });
  });
});
