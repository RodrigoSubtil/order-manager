import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { buildPrintProductSummary } from '../../../shared/lib/productGrouping';
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
    expect(screen.getByText('Pedido #27')).toBeInTheDocument();
    expect(screen.getByText('Telefone: +351 912 345 678')).toBeInTheDocument();
    expect(screen.getByText('Responsável: Maria Helena')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
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

  it('identifica cada bolo por pedido no resumo, sem juntar pesos iguais', () => {
    const firstOrder = {
      ...order,
      products: [{ ...order.products[0], product: 'Bolo de chocolate', quantity: '1 kg' }],
    };
    const secondOrder = { ...firstOrder, id: 'order-2', orderNumber: 28 };

    render(
      <PrintableOrders
        getResponsibleName={(item) => item.responsibleName}
        printAll
        printDescription="Resumo de produção"
        printFrom={order.deliveryDate}
        printFromTime="00:00"
        printMode="summary"
        printOrderCount={2}
        printOrders={[firstOrder, secondOrder]}
        printProductSummary={buildPrintProductSummary([firstOrder, secondOrder])}
        printRangeMode="day"
        printUntil={order.deliveryDate}
        printUntilTime="23:59"
      />,
    );

    expect(screen.getAllByText('Bolo de chocolate')).toHaveLength(2);
    expect(screen.getByText(/Pedido #27/)).toBeInTheDocument();
    expect(screen.getByText(/Pedido #28/)).toBeInTheDocument();
    expect(screen.getAllByText('1 kg')).toHaveLength(2);
  });

  it('mantém todos os produtos de uma encomenda longa no documento', () => {
    const longProducts = Array.from({ length: 50 }, (_, index) => ({
      ...order.products[0],
      id: `item-${index + 1}`,
      product: `Produto ${index + 1}`,
    }));

    render(
      <PrintableOrders
        getResponsibleName={(item) => item.responsibleName}
        printAll={false}
        printDescription="Ficha individual"
        printFrom={order.deliveryDate}
        printFromTime="00:00"
        printMode="orders"
        printOrderCount={1}
        printOrders={[{ ...order, products: longProducts }]}
        printProductSummary={[]}
        printRangeMode="day"
        printUntil={order.deliveryDate}
        printUntilTime="23:59"
      />,
    );

    expect(screen.getByText('Produto 1')).toBeInTheDocument();
    expect(screen.getByText('Produto 50')).toBeInTheDocument();
    expect(screen.getAllByRole('row', { hidden: true })).toHaveLength(51);
  });
});
