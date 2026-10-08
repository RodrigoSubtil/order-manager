import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { appVersion } from '../../../shared/lib/appVersion';
import { SessionHeader } from './SessionHeader';

describe('SessionHeader permissions', () => {
  it('hides management from an operator', () => {
    render(
      <SessionHeader
        canManage={false}
        userDisplayName="Operador"
        onLogoutRequest={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Gerenciar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('shows management to the owner', () => {
    render(
      <SessionHeader
        canManage
        userDisplayName="Pastelaria Vénus"
        onLogoutRequest={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Gerenciar' })).toBeInTheDocument();
    expect(screen.getByText(appVersion)).toBeInTheDocument();
  });

  it('supports using the management action as a return to orders', () => {
    render(
      <SessionHeader
        canManage
        managementLabel="Encomendas"
        userDisplayName="Pastelaria Vénus"
        onLogoutRequest={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Encomendas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerenciar' })).not.toBeInTheDocument();
  });
});
