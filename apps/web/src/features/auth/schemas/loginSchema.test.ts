import { describe, expect, it } from 'vitest';

import { loginSchema } from './loginSchema';

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({
      username: 'gestor@padaria.test',
      password: 'uma-palavra-passe',
    });

    expect(result.success).toBe(true);
  });

  it('accepts an optional remember-me choice', () => {
    expect(
      loginSchema.safeParse({
        username: 'gestor@padaria.test',
        password: 'uma-palavra-passe',
        rememberMe: true,
      }).success,
    ).toBe(true);
  });

  it.each([
    [{ username: '', password: 'segredo' }, 'username'],
    [{ username: 'email-invalido', password: 'segredo' }, 'username'],
    [{ username: 'gestor@padaria.test', password: '' }, 'password'],
  ])('rejects invalid login values %#', (values, expectedField) => {
    const result = loginSchema.safeParse(values);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === expectedField)).toBe(true);
    }
  });
});
