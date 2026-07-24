import { describe, expect, it } from 'vitest';

import { createBackupFileName } from './downloadBackup';

describe('createBackupFileName', () => {
  it('creates a sortable filename without characters invalid on Windows', () => {
    expect(createBackupFileName(new Date('2026-07-24T12:34:56.789Z'))).toBe(
      'order-manager-backup-2026-07-24T12-34-56-789Z.json',
    );
  });
});
