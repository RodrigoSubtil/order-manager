import { AuthController } from '../src/auth/auth.controller';
import { MembershipRole } from '../src/generated/prisma/client';

describe('AuthController', () => {
  const user = { id: 'user-a', email: 'owner@example.test', displayName: 'Owner' };
  const tenant = {
    membershipId: 'membership-a',
    tenantId: 'tenant-a',
    tenantSlug: 'alpha',
    role: MembershipRole.OWNER,
  };
  const session = { accessToken: 'access-token', refreshToken: 'refresh-token', expiresIn: 3600 };

  function createResponse() {
    return { cookie: jest.fn(), clearCookie: jest.fn() };
  }

  function createController() {
    const auth = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      requestPasswordRecovery: jest.fn(),
    };
    const tenants = { resolveOptionalForUser: jest.fn().mockResolvedValue(tenant) };
    const tenantSession = { read: jest.fn(), issue: jest.fn(), clear: jest.fn() };
    const users = { synchronizeIdentity: jest.fn() };
    const config = {
      getOrThrow: jest.fn().mockImplementation((key) => (key === 'NODE_ENV' ? 'test' : 86400)),
    };
    return {
      controller: new AuthController(
        auth as never,
        tenants as never,
        tenantSession as never,
        users as never,
        config as never,
      ),
      auth,
      tenants,
      tenantSession,
    };
  }

  it('sets HttpOnly tokens and returns no credentials in the login body', async () => {
    const { controller, auth } = createController();
    auth.login.mockResolvedValue({ user, session });
    const response = createResponse();

    await expect(
      controller.login(
        { email: user.email, password: 'a-safe-password' },
        { headers: {} } as never,
        response as never,
      ),
    ).resolves.toEqual({
      user,
      tenant: { id: 'tenant-a', slug: 'alpha' },
      role: MembershipRole.OWNER,
      tenantSelectionRequired: false,
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'om_access_token',
      'access-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'om_refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('uses a persistent HttpOnly session only when rememberMe is selected', async () => {
    const { controller, auth } = createController();
    auth.login.mockResolvedValue({ user, session });
    const response = createResponse();

    await controller.login(
      { email: user.email, password: 'a-safe-password', rememberMe: true },
      { headers: {} } as never,
      response as never,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'om_session_persistence',
      'persistent',
      expect.objectContaining({ httpOnly: true, maxAge: session.expiresIn * 1000 }),
    );
  });

  it('clears local cookies during logout even when Supabase logout is best effort', async () => {
    const { controller, auth, tenantSession } = createController();
    const response = createResponse();

    await controller.logout(
      {
        headers: { cookie: 'om_access_token=access-token; om_refresh_token=refresh-token' },
      } as never,
      response as never,
    );

    expect(auth.logout).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(response.clearCookie).toHaveBeenCalledWith('om_access_token', expect.any(Object));
    expect(response.clearCookie).toHaveBeenCalledWith('om_refresh_token', expect.any(Object));
    expect(response.clearCookie).toHaveBeenCalledWith('om_csrf_token', expect.any(Object));
    expect(tenantSession.clear).toHaveBeenCalledWith(response);
  });

  it('accepts a recovery request without exposing whether the account exists', async () => {
    const { controller, auth } = createController();

    await expect(
      controller.requestPasswordRecovery({ email: 'owner@example.test' }),
    ).resolves.toEqual({
      message: 'If the account exists, recovery instructions will be sent.',
    });
    expect(auth.requestPasswordRecovery).toHaveBeenCalledWith('owner@example.test');
  });

  it('rotates tokens on refresh and preserves a server-validated tenant context', async () => {
    const { controller, auth, tenantSession } = createController();
    auth.refresh.mockResolvedValue({ user, session });
    const response = createResponse();

    await expect(
      controller.refresh(
        { headers: { cookie: 'om_refresh_token=refresh-token' } } as never,
        response as never,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        tenant: { id: 'tenant-a', slug: 'alpha' },
        role: MembershipRole.OWNER,
      }),
    );
    expect(auth.refresh).toHaveBeenCalledWith('refresh-token');
    expect(tenantSession.issue).toHaveBeenCalledWith(response, user.id, 'membership-a');
  });
});
