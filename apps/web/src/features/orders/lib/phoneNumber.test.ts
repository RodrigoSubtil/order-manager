import { describe, expect, it } from 'vitest';

import {
  formatInternationalPhone,
  joinInternationalPhone,
  splitInternationalPhone,
} from './phoneNumber';

describe('international phone numbers', () => {
  it('reads legacy Portuguese numbers with the PT default', () => {
    expect(splitInternationalPhone('912345678')).toMatchObject({
      countryCode: '351',
      nationalNumber: '912345678',
    });
    expect(formatInternationalPhone('912345678')).toBe('+351 912345678');
  });

  it('joins and splits a selected foreign calling code', () => {
    expect(joinInternationalPhone('55', '11999999999')).toBe('5511999999999');
    expect(splitInternationalPhone('5511999999999')).toMatchObject({
      countryCode: '55',
      nationalNumber: '11999999999',
    });
  });

  it('recognizes a Norwegian customer already stored in the database', () => {
    expect(splitInternationalPhone('47984171380')).toMatchObject({
      countryCode: '47',
      nationalNumber: '984171380',
      recognized: true,
    });
    expect(formatInternationalPhone('47984171380')).toBe('+47 984171380');
  });

  it('preserves an uncommon international number', () => {
    const parsed = splitInternationalPhone('+972 541234567');
    expect(parsed.recognized).toBe(false);
    expect(joinInternationalPhone(parsed.countryCode, parsed.nationalNumber)).toBe('972541234567');
    expect(formatInternationalPhone('+972 541234567')).toBe('+972541234567');
  });
});
