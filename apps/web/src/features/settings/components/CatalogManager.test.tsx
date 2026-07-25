import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogProductRecord } from '../../../shared/lib/supabaseData';
import { CatalogManager } from './CatalogManager';

const items: CatalogProductRecord[] = [
  {
    id: 'product-1',
    name: 'Pastel de Nata',
    category: 'Pastelaria',
    defaultUnit: 'UN',
    version: 1,
  },
  {
    id: 'product-2',
    name: 'Baguete',
    category: 'Padaria',
    defaultUnit: 'UN',
    version: 1,
  },
];

describe('CatalogManager', () => {
  it('does not ask for a unit and filters the real product list', async () => {
    const user = userEvent.setup();

    render(
      <CatalogManager
        draft={{ name: '', category: 'Pastelaria' }}
        isLoading={false}
        isSaving={false}
        items={items}
        onDelete={vi.fn()}
        onDraftChange={vi.fn()}
        onReset={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Unidade')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar produto' }), 'nata');

    expect(screen.getByText('Pastel de Nata')).toBeInTheDocument();
    expect(screen.queryByText('Baguete')).not.toBeInTheDocument();
    expect(screen.getByText('1 produto encontrado')).toBeInTheDocument();
  });
});
