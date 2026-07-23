import { QuantityUnit } from '../../src/generated/prisma/client';

export type ParsedLegacyQuantity =
  { ok: true; value: string; unit: QuantityUnit } | { ok: false; reason: string };

const units = new Map<string, QuantityUnit>([
  ['un', QuantityUnit.UN],
  ['uni', QuantityUnit.UN],
  ['unidade', QuantityUnit.UN],
  ['unidades', QuantityUnit.UN],
  ['kg', QuantityUnit.KG],
  ['quilo', QuantityUnit.KG],
  ['quilos', QuantityUnit.KG],
  ['g', QuantityUnit.G],
  ['grama', QuantityUnit.G],
  ['gramas', QuantityUnit.G],
]);

export function parseLegacyQuantity(raw: string): ParsedLegacyQuantity {
  const value = raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const match = value.match(/^([0-9]+(?:[.,][0-9]{1,3})?)\s*([a-z]*)$/u);
  if (!match) {
    return { ok: false, reason: 'Expected a positive number followed by UN, KG or G.' };
  }

  const quantity = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, reason: 'Quantity must be a finite positive value.' };
  }
  const normalizedUnit = match[2] || 'un';
  const unit = units.get(normalizedUnit);
  if (!unit) return { ok: false, reason: `Unsupported quantity unit: ${normalizedUnit}.` };

  return { ok: true, value: quantity.toFixed(3).replace(/\.?0+$/, ''), unit };
}
