import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

describe('LoginPage account options', () => {
  it('shows and hides the password without changing its value', async () => {
    const user = userEvent.setup();

    render(<LoginPage isCheckingSession={false} sessionError="" onLogin={vi.fn()} />);

    const password = screen.getByLabelText('Senha');
    await user.type(password, 'senha-temporaria');

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('senha-temporaria');

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('exposes username and the persistent-session choice without recovery actions', () => {
    render(<LoginPage isCheckingSession={false} sessionError="" onLogin={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Utilizador' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Manter conectado' })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Trocar senha' })).not.toBeInTheDocument();
  });
});
