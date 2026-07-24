import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderIndicators } from './OrderIndicators';

describe('OrderIndicators', () => {
  it('shows global operational totals without an old-orders card', () => {
    render(<OrderIndicators stats={{ today: 2, upcoming: 3 }} total={5} />);

    expect(screen.getByText('Total encomendas')).toBeInTheDocument();
    expect(screen.getByText('Para hoje')).toBeInTheDocument();
    expect(screen.getByText('Próximos dias')).toBeInTheDocument();
    expect(screen.queryByText('Encomendas anteriores')).not.toBeInTheDocument();
  });
});
