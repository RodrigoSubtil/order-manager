const internalAuthDomain = 'users.order-manager.invalid';
const authIdentityAliases: Record<string, string> = {
  pastelaria_venus: 'pastelaria-venus',
};

export function normalizeUsername(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 32);
}

/**
 * Supabase Auth requires an email-shaped identity. The application never asks
 * for or displays an email: it derives this reserved technical identifier from
 * the username selected by the owner.
 */
export function usernameToAuthIdentity(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const internalUsername = authIdentityAliases[normalizedUsername] ?? normalizedUsername;
  return `${internalUsername}@${internalAuthDomain}`;
}
