import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Order } from '../../../shared/lib/domain';
import { DeleteOrderDialog } from './DeleteOrderDialog';

const order: Order = {
  id: 'order-21',
  orderNumber: 21,
  clientName: 'Duda',
  phone: '913824004',
  responsibleId: 'responsible-1',
  responsibleName: 'David',
  deliveryDate: '2026-07-24',
  deliveryTime: '20:15',
  products: [],
  createdAt: '2026-07-24T10:00:00Z',
  version: 1,
};

describe('DeleteOrderDialog', () => {
  it('shows only the essential order identification and keeps balanced actions', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteOrderDialog
        isSaving={false}
        order={order}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Cliente: Duda')).toBeInTheDocument();
    expect(screen.queryByText('Pedido #21')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apagar encomenda' }));
    expect(onConfirm).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
