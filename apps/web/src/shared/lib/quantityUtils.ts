export function parseQuantity(quantity: string) {
  const cleanQuantity = quantity.trim();
  const match = cleanQuantity.match(/^([\d.,]+)/);

  if (!match) {
    return {
      amount: cleanQuantity ? 1 : 0,
      unit: 'unidade',
      raw: cleanQuantity,
    };
  }

  const amount = Number(match[1].replace(',', '.'));
  const unit = cleanQuantity.slice(match[1].length).trim() || 'unidade';

  return {
    amount: Number.isFinite(amount) ? amount : 0,
    unit: normalizeQuantityUnit(unit),
    raw: cleanQuantity,
  };
}

export function normalizeQuantityUnit(unit: string) {
  const cleanUnit = unit.trim().toLowerCase();

  if (['un', 'uni', 'unidade', 'unidades'].includes(cleanUnit)) return 'un';
  if (['kg', 'quilo', 'quilos'].includes(cleanUnit)) return 'kg';
  if (['g', 'grama', 'gramas'].includes(cleanUnit)) return 'g';

  return cleanUnit || 'un';
}

export function isSummableQuantityUnit(unit: string) {
  return normalizeQuantityUnit(unit) === 'un';
}

export function formatQuantityTotal(amount: number, unit: string) {
  return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(amount)} ${unit}`;
}

export function getQuantityAmount(quantity: string) {
  const { amount } = parseQuantity(quantity);
  return amount ? String(amount).replace('.', ',') : '';
}

export function getQuantityUnit(quantity: string) {
  return parseQuantity(quantity).unit;
}

export function joinQuantity(amount: string, unit: string) {
  const cleanAmount = amount.trim().replace(',', '.');
  const cleanUnit = normalizeQuantityUnit(unit);

  if (!cleanAmount) {
    return '';
  }

  return `${cleanAmount} ${cleanUnit}`;
}
