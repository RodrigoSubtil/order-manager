import { describe, expect, it } from 'vitest';

import {
  formatInternationalPhone,
  formatNationalPhone,
  joinInternationalPhone,
  splitInternationalPhone,
} from './phoneNumber';

describe('international phone numbers', () => {
  it('reads legacy Portuguese numbers with the PT default', () => {
    expect(splitInternationalPhone('912345678')).toMatchObject({
      countryCode: '351',
      nationalNumber: '912345678',
    });
    expect(formatInternationalPhone('912345678')).toBe('+351 912 345 678');
  });

  it('joins and splits a selected foreign calling code', () => {
    expect(joinInternationalPhone('55', '11999999999')).toBe('5511999999999');
    expect(splitInternationalPhone('5511999999999')).toMatchObject({
      countryCode: '55',
      nationalNumber: '11999999999',
    });
    expect(formatInternationalPhone('5511999999999')).toBe('+55 11 99999 9999');
    expect(formatNationalPhone('55', '11999999999')).toBe('(11) 99999-9999');
  });

  it('recognizes a Norwegian customer already stored in the database', () => {
    expect(splitInternationalPhone('47984171380')).toMatchObject({
      countryCode: '47',
      nationalNumber: '984171380',
      recognized: true,
    });
    expect(formatInternationalPhone('47984171380')).toBe('+47 984171380');
  });

  it('formats the national field while preserving every digit for saving', () => {
    expect(formatNationalPhone('351', '912345678')).toBe('912 345 678');
    expect(formatNationalPhone('351', '9123')).toBe('912 3');
    expect(formatNationalPhone('33', '612345678')).toBe('6 12 34 56 78');
    expect(formatNationalPhone('44', '7911123456')).toBe('7911 123456');
    expect(formatNationalPhone('244', '923456789')).toBe('923 456 789');
    expect(joinInternationalPhone('351', formatNationalPhone('351', '912345678'))).toBe(
      '351912345678',
    );
  });

  it('preserves an uncommon international number', () => {
    const parsed = splitInternationalPhone('+972 541234567');
    expect(parsed.recognized).toBe(false);
    expect(joinInternationalPhone(parsed.countryCode, parsed.nationalNumber)).toBe('972541234567');
    expect(formatInternationalPhone('+972 541234567')).toBe('+972 54 123 4567');
  });
});
