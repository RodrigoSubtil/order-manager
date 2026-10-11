import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMinuteClock } from './useMinuteClock';

afterEach(() => vi.useRealTimers());
describe('relógio partilhado do painel', () => {
  it('atualiza na virada do minuto e limpa o único temporizador ao sair', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T10:12:35Z'));
    const { result, unmount } = renderHook(() => useMinuteClock(true));
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(25_000));
    expect(result.current).toBe(Date.parse('2026-10-11T10:13:00Z'));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('atualiza imediatamente ao voltar à aba e não funciona sem sessão ativa', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T10:12:00Z'));
    const { result, rerender, unmount } = renderHook(({ enabled }) => useMinuteClock(enabled), {
      initialProps: { enabled: true },
    });
    vi.setSystemTime(new Date('2026-10-11T12:30:00Z'));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).toBe(Date.parse('2026-10-11T12:30:00Z'));
    rerender({ enabled: false });
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });
});
