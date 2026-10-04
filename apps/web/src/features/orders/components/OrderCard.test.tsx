import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { OrderCard } from './OrderCard';

const order: Order = {
  id: 'order-1',
  orderNumber: 7,
  clientName: 'Ana Silva',
  phone: '912345678',
  responsibleId: 'responsible-1',
  responsibleName: 'Maria',
  deliveryDate: '2026-07-24',
  deliveryTime: '10:00',
  products: [],
  createdAt: '2026-07-24T08:00:00Z',
  version: 1,
};

describe('OrderCard', () => {
  it('offers the complete action and delegates the confirmed operation', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <OrderCard
        order={order}
        search=""
        responsibleName="Maria"
        onComplete={onComplete}
        onPrint={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('opens the order phone on WhatsApp between the complete and edit actions', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    render(
      <OrderCard
        order={order}
        search=""
        responsibleName="Maria"
        onComplete={vi.fn()}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
      />,
    );

    expect(screen.getByText(/Telefone:/)).toHaveTextContent('+351 912 345 678');

    const actions = within(screen.getByLabelText('Ações da encomenda')).getAllByRole('button');

    expect(actions.map((action) => action.getAttribute('aria-label'))).toEqual([
      'Concluir',
      'Abrir conversa no WhatsApp',
      'Editar',
      'Imprimir',
    ]);

    await user.click(screen.getByRole('button', { name: 'Abrir conversa no WhatsApp' }));

    expect(open).toHaveBeenCalledWith(
      'https://wa.me/351912345678',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('preserves a phone number that already has an international prefix', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    render(
      <OrderCard
        order={{ ...order, phone: '+55 (11) 99999-9999' }}
        search=""
        responsibleName="Maria"
        onPrint={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Abrir conversa no WhatsApp' }));

    expect(open).toHaveBeenCalledWith(
      'https://wa.me/5511999999999',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('groups products by section even when equal sections were entered apart', () => {
    const { container } = render(
      <OrderCard
        order={{
          ...order,
          products: [
            {
              id: 'product-1',
              category: 'Pastelaria',
              product: 'Bolo',
              quantity: '1 un',
              notes: '',
            },
            {
              id: 'product-2',
              category: 'Salgados',
              product: 'Coxinha',
              quantity: '20 un',
              notes: '',
            },
            {
              id: 'product-3',
              category: 'Pastelaria',
              product: 'Tarte',
              quantity: '2 un',
              notes: '',
            },
          ],
        }}
        search=""
        responsibleName="Maria"
        onPrint={vi.fn()}
      />,
    );

    const groups = container.querySelectorAll('[data-product-category]');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute('data-product-category', 'Pastelaria');
    expect(groups[0]).toHaveTextContent('Bolo');
    expect(groups[0]).toHaveTextContent('Tarte');
    expect(groups[1]).toHaveAttribute('data-product-category', 'Salgados');
    expect(groups[1]).toHaveTextContent('Coxinha');
    expect(screen.getAllByRole('heading', { name: 'Pastelaria' })).toHaveLength(1);
  });
});
