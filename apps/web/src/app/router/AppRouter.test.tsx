import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppRouter } from './AppRouter';

vi.mock('../../features/orders/pages/OrdersPage', () => ({
  default: () => <div>Página de encomendas</div>,
}));

vi.mock('../../features/settings/pages/SettingsPage', () => ({
  default: () => <div>Página de gerenciamento</div>,
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('AppRouter', () => {
  it('abre a página de encomendas para a rota principal', () => {
    window.history.replaceState(null, '', '/');
    render(<AppRouter />);

    expect(screen.getByText('Página de encomendas')).toBeInTheDocument();
  });

  it('abre gerenciamento e acompanha a navegação do histórico', async () => {
    window.history.replaceState(null, '', '/settings');
    render(<AppRouter />);

    expect(screen.getByText('Página de gerenciamento')).toBeInTheDocument();

    await act(async () => {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByText('Página de encomendas')).toBeInTheDocument();
  });
});
