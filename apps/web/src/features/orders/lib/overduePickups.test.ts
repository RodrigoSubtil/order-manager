import { describe, expect, it } from 'vitest';
import {
  formatPickupDelay,
  pickupDeadline,
  pickupDelayMinutes,
  pickupSchedule,
} from './overduePickups';
import type { Order } from '../../../shared/lib/domain';

describe('horário e atraso da recolha em Lisboa', () => {
  it('respeita o horário de verão e inverno sem depender do fuso do aparelho', () => {
    expect(pickupDeadline('2026-10-11', '10:00')).toBe(Date.parse('2026-10-11T09:00:00Z'));
    expect(pickupDeadline('2026-12-11', '10:00')).toBe(Date.parse('2026-12-11T10:00:00Z'));
  });
  it('trata a hora inexistente e a hora repetida sem avisar antes do prazo', () => {
    expect(pickupDeadline('2026-03-29', '01:30')).toBeNull();
    expect(pickupDeadline('2026-10-25', '01:30')).toBe(Date.parse('2026-10-25T01:30:00Z'));
  });
  it('não inventa atraso quando faltam dados ou a data/hora é inválida', () => {
    for (const [date, time] of [
      ['', '10:00'],
      ['2026-02-30', '10:00'],
      ['2026-10-11', ''],
      ['2026-10-11', '24:00'],
      ['2026-10-11', '10:60'],
    ]) {
      expect(pickupDeadline(date, time)).toBeNull();
    }
    expect(pickupDelayMinutes(null, Date.now())).toBeNull();
  });
  it('só considera atraso após o horário e atualiza os minutos decorridos', () => {
    const deadline = pickupDeadline('2026-10-11', '10:00')!;
    expect(pickupDelayMinutes(deadline, deadline - 1)).toBeNull();
    expect(pickupDelayMinutes(deadline, deadline)).toBeNull();
    expect(pickupDelayMinutes(deadline, deadline + 1)).toBe(0);
    expect(pickupDelayMinutes(deadline, deadline + 72 * 60_000)).toBe(72);
    expect(formatPickupDelay(0)).toBe('menos de 1 min');
    expect(formatPickupDelay(18)).toBe('18 min');
    expect(formatPickupDelay(72)).toBe('1 h 12 min');
    expect(formatPickupDelay(1440)).toBe('1 d');
    expect(formatPickupDelay(1482)).toBe('1 d 42 min');
  });
  it('ordena pendências de dias anteriores primeiro e ignora as sem horário válido', () => {
    const orders = [
      { id: 'today', deliveryDate: '2026-10-11', deliveryTime: '10:00' },
      { id: 'previous', deliveryDate: '2026-10-10', deliveryTime: '10:30' },
      { id: 'missing', deliveryDate: '2026-10-11', deliveryTime: '' },
    ] as Order[];
    expect(pickupSchedule(orders).map((item) => item.order.id)).toEqual(['previous', 'today']);
  });
});
