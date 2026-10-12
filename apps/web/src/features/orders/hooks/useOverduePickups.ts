import { useMemo } from 'react';
import type { Order } from '../../../shared/lib/domain';
import { pickupDelayMinutes, pickupSchedule } from '../lib/overduePickups';

export function useOverduePickups(orders: Order[], now: number) {
  const schedule = useMemo(() => pickupSchedule(orders), [orders]);
  return useMemo(() => {
    const overdue = schedule.filter((item) => pickupDelayMinutes(item.deadline, now) !== null);
    return {
      orders: overdue.map((item) => item.order),
    };
  }, [schedule, now]);
}
