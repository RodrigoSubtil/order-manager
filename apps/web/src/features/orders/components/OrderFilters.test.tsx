import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { todayKey } from '../../../shared/lib/dateUtils';
import { OrderFilters } from './OrderFilters';

describe('OrderFilters', () => {
  it('keeps the requested filter order and reports the complete filtered result count', async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();

    render(
      <OrderFilters
        categoryFilter="Todas"
        dateFilter=""
        isCategoryFilterOpen={false}
        resultCount={12}
        search=""
        onCategoryChange={vi.fn()}
        onCategoryOpenChange={vi.fn()}
        onCreate={vi.fn()}
        onDateChange={onDateChange}
        onPrint={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );

    const area = screen.getByRole('combobox', { name: 'Filtrar por área' });
    const today = screen.getByRole('button', { name: 'Hoje' });
    const allDates = screen.getByRole('button', { name: 'Todas as datas' });
    const date = screen.getByRole('button', { name: 'Filtrar por data' });
    const create = screen.getByRole('button', { name: 'Nova encomenda' });
    const print = screen.getByRole('button', { name: 'Imprimir todas' });

    expect(area).toHaveValue('Áreas');
    expect(area.compareDocumentPosition(today)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(today.compareDocumentPosition(allDates)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(allDates.compareDocumentPosition(date)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(date.compareDocumentPosition(create)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(create.compareDocumentPosition(print)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('12 resultados')).toBeInTheDocument();

    await user.click(today);
    expect(onDateChange).toHaveBeenCalledWith(todayKey());
  });
});
