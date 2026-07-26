import { describe, expect, it } from 'vitest';

import { isValidUsername, normalizeUsername, usernameToAuthIdentity } from './authIdentity';

describe('username authentication identity', () => {
  it('normalizes a username without exposing the technical identity in the interface', () => {
    expect(normalizeUsername('  Pastelaria_Venus  ')).toBe('pastelaria_venus');
    expect(usernameToAuthIdentity('Pastelaria_Venus')).toBe(
      'pastelaria-venus@users.order-manager.invalid',
    );
  });

  it.each(['padaria_central', 'venus_2', 'loja123'])(
    'supports another valid business username: %s',
    (username) => {
      expect(isValidUsername(username)).toBe(true);
      expect(usernameToAuthIdentity(username)).toContain('@users.order-manager.invalid');
    },
  );

  it.each(['', 'ab', 'pastelaria venus', 'pastelaria-venus', 'utilizador@email.pt'])(
    'rejects the invalid username %s with a generic error',
    (username) => {
      expect(() => usernameToAuthIdentity(username)).toThrow('Utilizador ou senha incorretos.');
    },
  );
});
