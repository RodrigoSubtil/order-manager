import { describe, expect, it } from 'vitest';

import { normalizeUsername, usernameToAuthIdentity } from './authIdentity';

describe('username authentication identity', () => {
  it('normalizes the visible username consistently', () => {
    expect(normalizeUsername('  Chefe.Pastelaria  ')).toBe('chefe.pastelaria');
    expect(normalizeUsername('Pastelaria Vénus')).toBe('pastelaria-venus');
  });

  it('derives the private Supabase Auth identity deterministically', () => {
    expect(usernameToAuthIdentity('Chefe')).toBe('chefe@users.order-manager.invalid');
    expect(usernameToAuthIdentity('Pastelaria Vénus')).toBe(
      'pastelaria-venus@users.order-manager.invalid',
    );
  });
});
