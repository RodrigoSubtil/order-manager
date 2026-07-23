import { randomBytes, timingSafeEqual } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'om_access_token';
export const REFRESH_TOKEN_COOKIE = 'om_refresh_token';
export const CSRF_TOKEN_COOKIE = 'om_csrf_token';
export const SESSION_PERSISTENCE_COOKIE = 'om_session_persistence';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};

  return header.split(';').reduce<Record<string, string>>((cookies, value) => {
    const [name, ...encodedValue] = value.trim().split('=');
    if (name && encodedValue.length > 0) {
      cookies[name] = decodeURIComponent(encodedValue.join('='));
    }
    return cookies;
  }, {});
}

export function setSessionCookies(
  response: Response,
  config: ConfigService,
  session: SessionTokens,
  rememberMe = false,
): void {
  const secure = isSecureEnvironment(config);
  const common = {
    secure,
    sameSite: 'lax' as const,
    path: '/api/v1',
    ...(rememberMe ? { maxAge: session.expiresIn * 1000 } : {}),
  };

  response.cookie(ACCESS_TOKEN_COOKIE, session.accessToken, { ...common, httpOnly: true });
  response.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    ...common,
    httpOnly: true,
    path: '/api/v1/auth',
  });
  response.cookie(SESSION_PERSISTENCE_COOKIE, rememberMe ? 'persistent' : 'session', {
    ...common,
    httpOnly: true,
    path: '/api/v1/auth',
  });
}

export function isPersistentSession(header: string | undefined): boolean {
  return parseCookies(header)[SESSION_PERSISTENCE_COOKIE] === 'persistent';
}

export function clearSessionCookies(response: Response, config: ConfigService): void {
  const secure = isSecureEnvironment(config);
  const common = { secure, sameSite: 'lax' as const };
  response.clearCookie(ACCESS_TOKEN_COOKIE, { ...common, path: '/api/v1' });
  response.clearCookie(REFRESH_TOKEN_COOKIE, { ...common, path: '/api/v1/auth' });
  response.clearCookie(SESSION_PERSISTENCE_COOKIE, { ...common, path: '/api/v1/auth' });
  response.clearCookie(CSRF_TOKEN_COOKIE, { ...common, path: '/api/v1' });
}

export function issueCsrfCookie(response: Response, config: ConfigService): string {
  const token = randomBytes(32).toString('base64url');
  response.cookie(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false,
    secure: isSecureEnvironment(config),
    sameSite: 'lax',
    path: '/api/v1',
  });
  return token;
}

export function csrfTokensMatch(
  cookieToken: string | undefined,
  requestToken: string | undefined,
): boolean {
  if (!cookieToken || !requestToken) return false;
  const expected = Buffer.from(cookieToken);
  const actual = Buffer.from(requestToken);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isSecureEnvironment(config: ConfigService): boolean {
  const environment = config.getOrThrow<string>('NODE_ENV');
  return environment === 'staging' || environment === 'production';
}
