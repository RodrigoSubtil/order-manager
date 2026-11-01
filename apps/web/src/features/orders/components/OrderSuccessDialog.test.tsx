import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import { OrderSuccessDialog } from './OrderSuccessDialog';

function ConfirmationFlow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir confirmação</button>
      {open && <OrderSuccessDialog customerName="Ana Martins" onClose={() => setOpen(false)} />}
    </>
  );
}

describe('OrderSuccessDialog', () => {
  it('restaura o foco de origem depois de voltar às encomendas', async () => {
    const user = userEvent.setup();
    render(<ConfirmationFlow />);
    const trigger = screen.getByRole('button', { name: 'Abrir confirmação' });
    await user.click(trigger);
    const returnButton = screen.getByRole('button', { name: 'Voltar para as encomendas' });
    expect(returnButton).toHaveFocus();
    await user.click(returnButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('identifica o cliente apagado e permite voltar pelo teclado', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<OrderSuccessDialog customerName="Ana Martins" onClose={onClose} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Encomenda de Ana Martins apagada com sucesso.',
    );
    expect(screen.getByRole('button', { name: 'Voltar para as encomendas' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('shows the operation confirmation and returns to the order list', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<OrderSuccessDialog message="Encomenda #12 concluída com sucesso." onClose={onClose} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Encomenda #12 concluída com sucesso.');
    expect(screen.queryByText('A encomenda foi concluída corretamente.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voltar para as encomendas' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
