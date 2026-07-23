import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import App from './App';

async function login() {
  const user = userEvent.setup();
  window.history.pushState({}, '', '/');
  render(<App />);
  await screen.findByRole('heading', { name: 'Entrar no painel' });
  await user.type(screen.getByLabelText('Email'), 'gestor@alpha.test');
  await user.type(screen.getByLabelText('Palavra-passe'), 'segredo');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('heading', { name: 'Painel de encomendas' });
  return user;
}

describe('App API integration', () => {
  it('shows accessible validation before calling the API', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Entrar no painel' });
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const email = screen.getByLabelText('Email');
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Introduza o email.');
    expect(email).toHaveFocus();
  });

  it('logs in through the API and loads API-backed empty states', async () => {
    await login();
    expect(await screen.findByText('Nenhuma encomenda encontrada.')).toBeInTheDocument();
  });

  it('offers password recovery without revealing whether the account exists', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Entrar no painel' });
    await user.click(screen.getByRole('button', { name: 'Esqueci a palavra-passe' }));
    await user.type(
      screen.getByLabelText('Email', { selector: '#recovery-email' }),
      'gestor@alpha.test',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar instruções' }));

    expect(await screen.findByText(/Se a conta existir/)).toBeInTheDocument();
  });

  it('opens commercial settings and invites a user through the API contract', async () => {
    const user = await login();
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    await screen.findByRole('heading', { name: 'Configurações da empresa' });
    await user.type(screen.getByLabelText('Email'), 'novo@alpha.test');
    await user.click(screen.getByRole('button', { name: 'Convidar utilizador' }));

    expect(await screen.findByText('novo@alpha.test')).toBeInTheDocument();
  });

  it('creates an order through the generated API mutation and invalidates the list cache', async () => {
    const user = await login();
    await user.click(screen.getByRole('button', { name: 'Nova encomenda' }));
    await user.type(screen.getByLabelText('Nome do cliente'), 'Ana Silva');
    await user.type(screen.getByLabelText('Responsável pela encomenda'), 'Mar');
    await user.click(screen.getByRole('option', { name: 'Maria' }));
    await user.type(screen.getByLabelText('Produto'), 'Bolo de chocolate');
    await user.type(screen.getByLabelText('Quantidade'), '2');
    await user.click(screen.getByRole('button', { name: 'Guardar encomenda' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Adicionar encomenda' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole('heading', { name: 'Ana Silva' })).toBeInTheDocument();
  });
});
