import { describe, expect, it } from 'vitest';

import { appendRecoveryEvent, createRecoveryArchive } from './recoveryArchive';

describe('recovery archive', () => {
  it('keeps a chronological journal without replacing earlier operations', () => {
    const initial = createRecoveryArchive('tenant-1', new Date('2026-07-25T08:00:00.000Z'));
    const created = appendRecoveryEvent(
      initial,
      {
        resource: 'order',
        action: 'created',
        resourceId: 'order-1',
        after: { clientName: 'Ana' },
      },
      new Date('2026-07-25T08:05:00.000Z'),
    );
    const completed = appendRecoveryEvent(
      created,
      {
        resource: 'order',
        action: 'completed',
        resourceId: 'order-1',
        before: { clientName: 'Ana' },
      },
      new Date('2026-07-25T10:00:00.000Z'),
    );

    expect(completed.events).toHaveLength(2);
    expect(completed.events.map((event) => event.action)).toEqual(['created', 'completed']);
    expect(completed.updatedAt).toBe('2026-07-25T10:00:00.000Z');
  });
});
