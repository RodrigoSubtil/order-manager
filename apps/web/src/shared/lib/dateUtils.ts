export function todayKey() {
  return new Date().toLocaleDateString('sv-SE');
}

export function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString('sv-SE');
}

export function currentTimeKey(date = new Date()) {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export function formatDate(date: string) {
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}
