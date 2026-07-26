import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PrintOptionsDialog } from './PrintOptionsDialog';

function buildProps(
  overrides: Partial<ComponentProps<typeof PrintOptionsDialog>> = {},
): ComponentProps<typeof PrintOptionsDialog> {
  return {
    orderCount: 5,
    printFrom: '2026-07-24',
    printFromTime: '00:00',
    printMode: 'orders',
    printRangeMode: 'day',
    printUntil: '2026-07-24',
    printUntilTime: '23:59',
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    onFromChange: vi.fn(),
    onFromTimeChange: vi.fn(),
    onModeChange: vi.fn(),
    onRangeModeChange: vi.fn(),
    onUntilChange: vi.fn(),
    onUntilTimeChange: vi.fn(),
    ...overrides,
  };
}

function renderDialog(overrides: Partial<ComponentProps<typeof PrintOptionsDialog>> = {}) {
  const props = buildProps(overrides);
  render(<PrintOptionsDialog {...props} />);
  return props;
}

describe('PrintOptionsDialog', () => {
  it('permite escolher as horas inicial e final da produção', () => {
    const props = renderDialog();

    const start = screen.getByLabelText('Hora inicial');
    const end = screen.getByLabelText('Hora final');
    expect(start).toHaveValue('00:00');
    expect(end).toHaveValue('23:59');

    fireEvent.change(start, { target: { value: '09:00' } });
    fireEvent.change(end, { target: { value: '12:00' } });

    expect(props.onFromTimeChange).toHaveBeenCalledWith('09:00');
    expect(props.onUntilTimeChange).toHaveBeenCalledWith('12:00');
  });

  it('bloqueia a impressão quando o horário está incompleto ou invertido', () => {
    const { rerender } = render(<PrintOptionsDialog {...buildProps({ printUntilTime: '' })} />);

    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();

    rerender(
      <PrintOptionsDialog {...buildProps({ printFromTime: '15:00', printUntilTime: '09:00' })} />,
    );
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();
  });

  it('uses times only for a single day and hides them for a date period', () => {
    const { rerender } = render(<PrintOptionsDialog {...buildProps()} />);

    expect(screen.getByLabelText('Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora inicial')).toBeInTheDocument();
    expect(screen.queryByLabelText('Data final')).not.toBeInTheDocument();

    rerender(
      <PrintOptionsDialog
        {...buildProps({
          printRangeMode: 'period',
          printUntil: '2026-07-26',
          printFromTime: '',
          printUntilTime: '',
        })}
      />,
    );

    expect(screen.getByLabelText('Data inicial')).toBeInTheDocument();
    expect(screen.getByLabelText('Data final')).toBeInTheDocument();
    expect(screen.queryByLabelText('Hora inicial')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled();
    expect(screen.getByText('Formato de impressão')).toBeInTheDocument();
    expect(screen.getByText('Qtd. total dos produtos')).toBeInTheDocument();
  });

  it('uses the site calendar to choose the print date', () => {
    renderDialog();

    const dateControl = screen.getByLabelText('Data');
    expect(dateControl).toHaveAttribute('aria-haspopup', 'dialog');

    fireEvent.click(dateControl);

    expect(screen.getByRole('dialog', { name: 'Escolher data' })).toBeInTheDocument();
  });
});
