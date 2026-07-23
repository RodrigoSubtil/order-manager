import { describe, expect, it } from 'vitest';

import { loginSchema } from './loginSchema';

describe('loginSchema', () => {
  it('accepts a friendly username with spaces and accents', () => {
    const result = loginSchema.safeParse({
      username: '  Pastelaria Vénus  ',
      password: 'uma-senha',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('Pastelaria Vénus');
    }
  });

  it('accepts an optional remember-me choice', () => {
    expect(
      loginSchema.safeParse({
        username: 'operador',
        password: 'uma-senha',
        rememberMe: true,
      }).success,
    ).toBe(true);
  });

  it.each([
    [{ username: '', password: 'segredo' }, 'username'],
    [{ username: 'ç', password: 'segredo' }, 'username'],
    [{ username: 'operador', password: '' }, 'password'],
  ])('rejects invalid login values %#', (values, expectedField) => {
    const result = loginSchema.safeParse(values);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === expectedField)).toBe(true);
    }
  });
});
