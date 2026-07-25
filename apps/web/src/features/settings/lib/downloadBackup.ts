function backupTimestamp(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function createBackupFileName(date = new Date()) {
  return `order-manager-backup-${backupTimestamp(date)}.json`;
}

export function downloadBackup(
  serverSnapshot: Record<string, unknown>,
  localRecovery: unknown = null,
  date = new Date(),
) {
  const recoveryPackage = {
    format: 'order-manager-recovery-package',
    formatVersion: 2,
    generatedAt: date.toISOString(),
    serverSnapshot,
    localRecovery,
  };
  const blob = new Blob([JSON.stringify(recoveryPackage, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = createBackupFileName(date);
  link.click();
  URL.revokeObjectURL(url);
}
