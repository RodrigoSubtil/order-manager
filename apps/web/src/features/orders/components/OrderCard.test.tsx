import { render, screen } from '@testing-library/react';
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
});
