import { describe, expect, it } from 'vitest';

import { loginSchema } from './loginSchema';

describe('loginSchema', () => {
  it('accepts and normalizes a valid business username', () => {
    const result = loginSchema.safeParse({
      username: '  Pastelaria_Venus  ',
      password: 'uma-senha',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('pastelaria_venus');
    }
  });

  it('accepts an optional remember-me choice', () => {
    expect(
      loginSchema.safeParse({
        username: 'padaria_central',
        password: 'uma-senha',
        rememberMe: true,
      }).success,
    ).toBe(true);
  });

  it.each([
    [{ username: '', password: 'segredo' }, 'username'],
    [{ username: 'ab', password: 'segredo' }, 'username'],
    [{ username: 'pastelaria venus', password: 'segredo' }, 'username'],
    [{ username: 'pastelaria-venus', password: 'segredo' }, 'username'],
    [{ username: 'padaria_central', password: '' }, 'password'],
  ])('rejects invalid login values %#', (values, expectedField) => {
    const result = loginSchema.safeParse(values);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === expectedField)).toBe(true);
    }
  });
});
