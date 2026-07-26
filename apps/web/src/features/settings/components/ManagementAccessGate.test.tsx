import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ManagementAccessGate } from './ManagementAccessGate';

describe('ManagementAccessGate', () => {
  it('keeps the password hidden and submits it only after confirmation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ManagementAccessGate configured error="" isSubmitting={false} onSubmit={onSubmit} />);

    const password = screen.getByLabelText('Senha');
    expect(password).toHaveAttribute('type', 'password');

    await user.type(password, 'senha-gerencial');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith('senha-gerencial');
  });

  it('explains the one-time initialization when no password exists', () => {
    render(
      <ManagementAccessGate configured={false} error="" isSubmitting={false} onSubmit={vi.fn()} />,
    );

    expect(
      screen.getByText('O acesso gerencial será configurado pela primeira vez com esta senha.'),
    ).toBeInTheDocument();
  });
});
