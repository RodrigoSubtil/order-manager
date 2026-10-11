import type { Order } from '../../../shared/lib/domain';

const minute = 60_000;
const day = 86_400_000;
const lisbon = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function wallTime(timestamp: number) {
  const parts = lisbon.formatToParts(timestamp);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
}

export function pickupDeadline(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 10) !== date) return null;
  const offsets = new Set([-day, 0, day].map((delta) => wallTime(wall + delta) - (wall + delta)));
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((candidate) => wallTime(candidate) === wall);
  // A nonexistent spring time is invalid; use the later occurrence of a repeated autumn time.
  return matches.length ? Math.max(...matches) : null;
}

export function pickupDelayMinutes(deadline: number | null, now: number): number | null {
  if (deadline === null || !Number.isFinite(now) || now <= deadline) return null;
  return Math.floor((now - deadline) / minute);
}

export function formatPickupDelay(minutes: number) {
  if (minutes < 1) return 'menos de 1 min';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remaining = minutes % 60;
  return [days ? `${days} d` : '', hours ? `${hours} h` : '', remaining ? `${remaining} min` : '']
    .filter(Boolean)
    .join(' ');
}

export function pickupSchedule(orders: Order[]) {
  return orders
    .flatMap((order) => {
      const deadline = pickupDeadline(order.deliveryDate, order.deliveryTime);
      return deadline === null ? [] : [{ order, deadline }];
    })
    .sort(
      (a, b) =>
        a.deadline - b.deadline ||
        (a.order.orderNumber ?? 0) - (b.order.orderNumber ?? 0) ||
        a.order.id.localeCompare(b.order.id),
    );
}
