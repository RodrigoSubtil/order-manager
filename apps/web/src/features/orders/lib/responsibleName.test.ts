import { describe, expect, it } from 'vitest';

import { normalizeResponsibleName } from './responsibleName';

describe('normalizeResponsibleName', () => {
  it('capitalizes each initial and normalizes extra spaces', () => {
    expect(normalizeResponsibleName('  mARia   da  cONCEIÇÃO ')).toBe('Maria Da Conceição');
  });

  it('keeps accented and hyphenated names readable', () => {
    expect(normalizeResponsibleName('josé-mANUEL d\u00e1vila')).toBe('José-Manuel Dávila');
  });
});
