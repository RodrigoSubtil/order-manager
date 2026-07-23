import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  issueCsrfCookie,
  setSessionCookies,
} from '../src/common/auth/cookies';

describe('session cookie security', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('production'),
  };

  function createResponse() {
    return { cookie: jest.fn(), clearCookie: jest.fn() };
  }

  it('uses Secure, HttpOnly and scoped cookies for session credentials', () => {
    const response = createResponse();

    setSessionCookies(response as never, config as never, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    });

    expect(response.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      'access-token',
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/api/v1' }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/v1/auth',
      }),
    );
  });

  it('issues a readable CSRF token but keeps its transport attributes secure', () => {
    const response = createResponse();
    const token = issueCsrfCookie(response as never, config as never);

    expect(token).toHaveLength(43);
    expect(response.cookie).toHaveBeenCalledWith(
      CSRF_TOKEN_COOKIE,
      token,
      expect.objectContaining({ httpOnly: false, secure: true, sameSite: 'lax', path: '/api/v1' }),
    );
  });

  it('clears every session-related cookie with matching secure attributes', () => {
    const response = createResponse();

    clearSessionCookies(response as never, config as never);

    expect(response.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.objectContaining({ secure: true, sameSite: 'lax', path: '/api/v1' }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      expect.objectContaining({ secure: true, sameSite: 'lax', path: '/api/v1/auth' }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      CSRF_TOKEN_COOKIE,
      expect.objectContaining({ secure: true, sameSite: 'lax', path: '/api/v1' }),
    );
  });
});
