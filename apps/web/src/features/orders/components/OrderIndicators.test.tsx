import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OrderIndicators } from './OrderIndicators';

describe('OrderIndicators', () => {
  it('mantém a limpeza desativada quando não existem encomendas anteriores', () => {
    render(
      <OrderIndicators
        stats={{ previous: 0, today: 0, upcoming: 0 }}
        total={0}
        canDeletePrevious={false}
        onDeletePrevious={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Excluir encomendas anteriores' })).toBeDisabled();
  });

  it('permite a limpeza quando existem encomendas anteriores e o utilizador está autorizado', () => {
    render(
      <OrderIndicators
        stats={{ previous: 2, today: 1, upcoming: 3 }}
        total={6}
        canDeletePrevious
        onDeletePrevious={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Excluir encomendas anteriores' })).toBeEnabled();
  });
});
