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

    fireEvent.change(input, { target: { value: '11:45' } });
    expect(onChange).toHaveBeenCalledWith('11:45');
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

  it('não confirma uma hora anterior ao mínimo informado', () => {
    setMobileViewport(true);
    const onChange = vi.fn();
    render(<TimePicker minTime="14:30" value="13:00" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '13:00' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Para hoje, escolha 14:30 ou uma hora posterior.',
    );
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
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
