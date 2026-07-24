function backupTimestamp(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function createBackupFileName(date = new Date()) {
  return `order-manager-backup-${backupTimestamp(date)}.json`;
}

export function downloadBackup(data: Record<string, unknown>, date = new Date()) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = createBackupFileName(date);
  link.click();
  URL.revokeObjectURL(url);
}
