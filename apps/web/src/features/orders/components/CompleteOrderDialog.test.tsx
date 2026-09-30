import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { CompleteOrderDialog } from './CompleteOrderDialog';

const order: Order = {
  id: 'order-9',
  orderNumber: 9,
  clientName: 'Ana',
  phone: '912345678',
  responsibleId: 'responsible-1',
  responsibleName: 'Maria',
  deliveryDate: '2026-07-25',
  deliveryTime: '10:00',
  products: [],
  createdAt: '2026-07-25T08:00:00Z',
  version: 1,
};

describe('CompleteOrderDialog', () => {
  it('only completes after explicit confirmation', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CompleteOrderDialog
        isSaving={false}
        order={order}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Cliente: Ana')).toBeInTheDocument();
    expect(screen.getByText('Confirma a conclusão da encomenda?')).toBeInTheDocument();
    expect(screen.queryByText('Pedido #9')).not.toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Concluir encomenda' });
    expect(confirm.querySelector('svg path')).toHaveAttribute('d', 'm5 12 4 4L19 6');
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Não' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
