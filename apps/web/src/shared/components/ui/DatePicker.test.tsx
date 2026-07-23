import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('renders the selected date and sends the ISO key when a day is chosen', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DatePicker aria-label="Data de entrega" value="2026-01-10" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Data de entrega' })).toHaveTextContent('10/01/2026');

    await user.click(screen.getByRole('button', { name: 'Data de entrega' }));
    expect(screen.getByRole('dialog', { name: 'Escolher data' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /15 de janeiro de 2026/i }));
    expect(onChange).toHaveBeenCalledWith('2026-01-15');
    expect(screen.queryByRole('dialog', { name: 'Escolher data' })).not.toBeInTheDocument();
  });

  it('allows the filter calendar to clear its selected date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DatePicker
        aria-label="Filtrar por data"
        value="2026-01-10"
        onChange={onChange}
        withClearAction
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Filtrar por data' }));
    await user.click(screen.getByRole('button', { name: 'Limpar data' }));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
