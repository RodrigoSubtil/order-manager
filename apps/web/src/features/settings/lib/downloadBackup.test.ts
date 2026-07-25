import { describe, expect, it, vi } from 'vitest';

import { createBackupFileName, downloadBackup } from './downloadBackup';

describe('createBackupFileName', () => {
  it('creates a sortable filename without characters invalid on Windows', () => {
    expect(createBackupFileName(new Date('2026-07-24T12:34:56.789Z'))).toBe(
      'order-manager-backup-2026-07-24T12-34-56-789Z.json',
    );
  });

  it('downloads the server snapshot together with the local recovery journal', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadBackup(
      { orders: [{ id: 'order-1' }] },
      { events: [{ action: 'created' }] },
      new Date('2026-07-24T12:34:56.789Z'),
    );

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const content = JSON.parse(await blob.text()) as Record<string, unknown>;
    expect(content).toMatchObject({
      format: 'order-manager-recovery-package',
      formatVersion: 2,
      serverSnapshot: { orders: [{ id: 'order-1' }] },
      localRecovery: { events: [{ action: 'created' }] },
    });
    expect(click).toHaveBeenCalledOnce();

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });
});
