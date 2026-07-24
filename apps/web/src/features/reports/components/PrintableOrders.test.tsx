import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { PrintableOrders } from './PrintableOrders';

const order: Order = {
  id: 'order-1',
  orderNumber: 27,
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
      notes: 'Caixa separada',
    },
  ],
  createdAt: '2026-07-24T09:00:00.000Z',
  version: 1,
};

describe('PrintableOrders', () => {
  it('inclui produtos, quantidades e observações no conteúdo térmico', () => {
    render(
      <PrintableOrders
        getResponsibleName={(item) => item.responsibleName}
        printAll={false}
        printDescription="Ficha individual"
        printFrom={order.deliveryDate}
        printFromTime="00:00"
        printMode="orders"
        printOrderCount={1}
        printOrders={[order]}
        printProductSummary={[]}
        printRangeMode="day"
        printUntil={order.deliveryDate}
        printUntilTime="23:59"
      />,
    );

    expect(screen.getByText('Pastel de Nata')).toBeInTheDocument();
    expect(screen.getByText('12 un')).toBeInTheDocument();
    expect(screen.getByText('Caixa separada')).toBeInTheDocument();
    expect(screen.getByText('Ficha individual')).toBeInTheDocument();
    expect(screen.getByText('Ordem de produção')).toBeInTheDocument();
  });

  it('repeats the production header for every order in a general print', () => {
    render(
      <PrintableOrders
        getResponsibleName={(item) => item.responsibleName}
        printAll
        printDescription="Encomendas detalhadas"
        printFrom={order.deliveryDate}
        printFromTime="00:00"
        printMode="orders"
        printOrderCount={2}
        printOrders={[order, { ...order, id: 'order-2', orderNumber: 28 }]}
        printProductSummary={[]}
        printRangeMode="day"
        printUntil={order.deliveryDate}
        printUntilTime="23:59"
      />,
    );

    expect(screen.getAllByText('Ordem de produção')).toHaveLength(2);
    expect(screen.getAllByText('Encomendas detalhadas')).toHaveLength(2);
  });
});
