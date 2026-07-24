import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderCompletionDialog } from './OrderCompletionDialog';

describe('OrderCompletionDialog', () => {
  it('shows the completed confirmation and returns to the order list', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <OrderCompletionDialog message="Encomenda #12 concluída com sucesso." onClose={onClose} />,
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Encomenda #12 concluída com sucesso.');
    expect(screen.getByText(/retirada da lista de pedidos ativos/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voltar para as encomendas' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
