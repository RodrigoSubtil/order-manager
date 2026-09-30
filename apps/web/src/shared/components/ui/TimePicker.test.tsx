import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimePicker } from './TimePicker';

function setMobileViewport(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(
      (query: string) =>
        ({
          matches,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) satisfies MediaQueryList,
    ),
  );
}

describe('TimePicker', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('mantém o campo de hora nativo no computador', () => {
    setMobileViewport(false);
    const onChange = vi.fn();
    render(<TimePicker aria-label="Hora" minTime="09:00" value="10:30" onChange={onChange} />);

    const input = screen.getByLabelText('Hora');
    expect(input).toHaveAttribute('type', 'time');
    expect(input).toHaveAttribute('min', '09:00');
    expect(input).toHaveAttribute('step', '1800');

    fireEvent.change(input, { target: { value: '11:45' } });
    expect(onChange).toHaveBeenCalledWith('11:45');
  });

  it('mostra apenas minutos 00 e 30 e arredonda o primeiro horário disponível', () => {
    setMobileViewport(true);
    render(<TimePicker minTime="10:11" maxTime="21:00" value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar hora' }));
    const minuteOptions = within(screen.getByRole('listbox', { name: 'Minutos' })).getAllByRole(
      'option',
    );
    expect(minuteOptions.map((option) => option.textContent)).toEqual(['30']);
    expect(minuteOptions[0]).toHaveAttribute('aria-selected', 'true');
    expect(
      within(screen.getByRole('listbox', { name: 'Horas' })).getByRole('option', { name: '10' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('mostra apenas horas entre 08 e 21 e só 21:00 no fim do expediente', () => {
    setMobileViewport(true);
    render(<TimePicker minTime="08:00" maxTime="21:00" value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar hora' }));
    const hourOptions = within(screen.getByRole('listbox', { name: 'Horas' })).getAllByRole(
      'option',
    );
    expect(hourOptions.map((option) => option.textContent)).toEqual(
      Array.from({ length: 14 }, (_, index) => String(index + 8).padStart(2, '0')),
    );

    fireEvent.click(within(screen.getByRole('listbox', { name: 'Horas' })).getByText('21'));
    expect(
      within(screen.getByRole('listbox', { name: 'Minutos' })).getAllByRole('option'),
    ).toHaveLength(1);
    expect(within(screen.getByRole('listbox', { name: 'Minutos' })).getByText('00')).toBeVisible();
  });

  it('escolhe a hora pelas rodas deslizáveis no telemóvel', () => {
    setMobileViewport(true);
    const onChange = vi.fn();
    render(<TimePicker value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar hora' }));
    fireEvent.click(
      within(screen.getByRole('listbox', { name: 'Horas' })).getByRole('option', { name: '14' }),
    );
    fireEvent.click(
      within(screen.getByRole('listbox', { name: 'Minutos' })).getByRole('option', { name: '30' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onChange).toHaveBeenCalledWith('14:30');
    expect(screen.queryByRole('dialog', { name: 'Escolher hora' })).not.toBeInTheDocument();
  });

  it('atualiza a seleção quando a roda é deslizada', () => {
    setMobileViewport(true);
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<TimePicker value="08:00" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    const hourWheel = screen.getByRole('listbox', { name: 'Horas' });
    Object.defineProperty(hourWheel, 'scrollTop', {
      configurable: true,
      value: 12 * 44,
      writable: true,
    });
    fireEvent.scroll(hourWheel);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onChange).toHaveBeenCalledWith('12:00');
  });

  it('fecha o primeiro painel quando outro seletor móvel é aberto', () => {
    setMobileViewport(true);
    render(
      <>
        <TimePicker aria-label="Hora inicial" value="08:00" onChange={() => undefined} />
        <TimePicker aria-label="Hora final" value="17:00" onChange={() => undefined} />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hora inicial' }));
    expect(screen.getAllByRole('dialog', { name: 'Escolher hora' })).toHaveLength(1);

    fireEvent.mouseDown(screen.getByRole('presentation'));
    fireEvent.click(screen.getByRole('button', { name: 'Hora final' }));

    expect(screen.getAllByRole('dialog', { name: 'Escolher hora' })).toHaveLength(1);
  });

  it('avança uma seleção antiga para o primeiro horário válido', () => {
    setMobileViewport(true);
    const onChange = vi.fn();
    render(<TimePicker minTime="14:30" value="13:00" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '13:00' }));
    expect(within(screen.getByRole('listbox', { name: 'Horas' })).getByText('14')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onChange).toHaveBeenCalledWith('14:30');
  });

  it('informa quando o dia já não tem horários disponíveis', () => {
    setMobileViewport(true);
    render(<TimePicker minTime="21:15" maxTime="21:00" value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar hora' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não há horários disponíveis');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('cancela ou fecha a roda com Escape sem alterar o valor', () => {
    setMobileViewport(true);
    const onChange = vi.fn();
    render(<TimePicker value="08:00" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Escolher hora' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Escolher hora' })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
