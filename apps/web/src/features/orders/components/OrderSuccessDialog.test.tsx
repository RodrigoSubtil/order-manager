import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderSuccessDialog } from './OrderSuccessDialog';

describe('OrderSuccessDialog', () => {
  it('shows the operation confirmation and returns to the order list', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<OrderSuccessDialog message="Encomenda #12 concluída com sucesso." onClose={onClose} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Encomenda #12 concluída com sucesso.');
    expect(screen.queryByText('A encomenda foi concluída corretamente.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voltar para as encomendas' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
