export function todayKey() {
  return new Date().toLocaleDateString('sv-SE');
}

export function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString('sv-SE');
}

export function formatDate(date: string) {
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}
