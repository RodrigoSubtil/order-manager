const internalAuthDomain = 'users.order-manager.invalid';
const usernamePattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  const normalized = normalizeUsername(username);
  return normalized.length >= 3 && normalized.length <= 64 && usernamePattern.test(normalized);
}

/**
 * Supabase Auth requires an email-shaped identity. The browser derives a
 * reserved, non-contact identity from the username without displaying it.
 * Hyphens are deliberately excluded from public usernames, so replacing
 * underscores remains deterministic and collision-free.
 */
export function usernameToAuthIdentity(username: string) {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    throw new Error('Utilizador ou senha incorretos.');
  }

  return `${normalized.replaceAll('_', '-')}@${internalAuthDomain}`;
}
