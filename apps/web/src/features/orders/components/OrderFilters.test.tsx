import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { todayKey } from '../../../shared/lib/dateUtils';
import { OrderFilters } from './OrderFilters';

describe('OrderFilters', () => {
  it('uses the site combobox for the three date modes', async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();

    render(
      <OrderFilters
        categoryFilter="Todas"
        dateFilter=""
        dateFilterMode="all"
        hasCustomDate={false}
        isCategoryFilterOpen={false}
        resultCount={12}
        search=""
        onCategoryChange={vi.fn()}
        onCategoryOpenChange={vi.fn()}
        onCreate={vi.fn()}
        onDateChange={onDateChange}
        onDateModeChange={onDateChange}
        onPrint={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );

    const area = screen.getByRole('combobox', { name: 'Filtrar por área' });
    const date = screen.getByRole('combobox', { name: 'Filtrar por data' });
    const create = screen.getByRole('button', { name: 'Nova encomenda' });
    const print = screen.getByRole('button', { name: 'Imprimir todas' });

    expect(area).toHaveValue('Todas as áreas');
    expect(date).toHaveValue('Todas as datas');
    expect(area.compareDocumentPosition(date)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(date.compareDocumentPosition(print)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(print.compareDocumentPosition(create)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('data: todas')).toBeInTheDocument();
    expect(screen.getByText('área: todas')).toBeInTheDocument();
    expect(screen.getByText('12 resultados')).toBeInTheDocument();

    await user.click(date);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Todas as datas',
      'Hoje',
      'Definir data',
    ]);
    await user.click(screen.getByRole('option', { name: 'Hoje' }));
    expect(onDateChange).toHaveBeenCalledWith('today');
  });

  it('uses one field for the date and reopens the three options after a custom selection', async () => {
    const user = userEvent.setup();
    const props = {
      categoryFilter: 'Todas' as const,
      isCategoryFilterOpen: false,
      resultCount: 0,
      search: '',
      onCategoryChange: vi.fn(),
      onCategoryOpenChange: vi.fn(),
      onCreate: vi.fn(),
      onDateChange: vi.fn(),
      onDateModeChange: vi.fn(),
      onPrint: vi.fn(),
      onSearchChange: vi.fn(),
      hasCustomDate: false,
    };
    const { rerender } = render(
      <OrderFilters {...props} dateFilter={todayKey()} dateFilterMode="today" />,
    );
    expect(screen.getByRole('combobox', { name: 'Filtrar por data' })).toHaveValue('Hoje');
    expect(screen.queryByRole('button', { name: 'Escolher data do filtro' })).toBeNull();

    await user.click(screen.getByRole('combobox', { name: 'Filtrar por data' }));
    await user.click(screen.getByRole('option', { name: 'Definir data' }));
    expect(props.onDateModeChange).toHaveBeenCalledWith('custom');

    rerender(<OrderFilters {...props} dateFilter={todayKey()} dateFilterMode="custom" />);
    expect(screen.getByRole('combobox', { name: 'Filtrar por data' })).toHaveValue('Definir data');
    expect(screen.getByRole('dialog', { name: 'Escolher data' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escolher data do filtro' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByRole('dialog', { name: 'Escolher data' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(props.onDateChange).toHaveBeenCalledWith(todayKey());

    rerender(
      <OrderFilters {...props} hasCustomDate dateFilter={todayKey()} dateFilterMode="custom" />,
    );
    expect(screen.getByRole('combobox', { name: 'Filtrar por data' })).toHaveValue(
      new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(`${todayKey()}T12:00:00`)),
    );
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por data' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Todas as datas',
      'Hoje',
      'Definir data',
    ]);
  });
});
