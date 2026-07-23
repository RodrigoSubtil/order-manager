import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { AuthGuard } from '../src/common/guards/auth.guard';
import { CsrfGuard } from '../src/common/guards/csrf.guard';
import { MembershipRole, MembershipStatus } from '../src/generated/prisma/client';
import { TenantMembershipsService } from '../src/tenants/tenant-memberships.service';
import { TenantAccessService } from '../src/tenants/tenant-access.service';
import { TENANT_CONTEXT_COOKIE, TenantSessionService } from '../src/tenants/tenant-session.service';

function httpContext(request: Record<string, unknown>): ExecutionContextHost {
  const context = new ExecutionContextHost([]);
  jest.spyOn(context, 'switchToHttp').mockReturnValue({ getRequest: () => request } as never);
  return context;
}

describe('signed active tenant context', () => {
  const config = new ConfigService({
    NODE_ENV: 'test',
    SESSION_CONTEXT_SECRET: 'test-only-context-secret-at-least-32-characters',
    TENANT_CONTEXT_TTL_SECONDS: 3600,
  });
  const service = new TenantSessionService(config);

  it('accepts only an untampered HttpOnly context bound to the verified user', () => {
    const response = { cookie: jest.fn(), clearCookie: jest.fn() };
    service.issue(response as never, 'user-a', 'membership-a');
    const [, token] = response.cookie.mock.calls[0];
    const request = { headers: { cookie: `${TENANT_CONTEXT_COOKIE}=${token}` } };

    expect(service.read(request as never, 'user-a')).toBe('membership-a');
    expect(() => service.read(request as never, 'user-b')).toThrow(UnauthorizedException);
    const tampered = { headers: { cookie: `${TENANT_CONTEXT_COOKIE}=${token}x` } };
    expect(() => service.read(tampered as never, 'user-a')).toThrow(UnauthorizedException);
    expect(response.cookie).toHaveBeenCalledWith(
      TENANT_CONTEXT_COOKIE,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', secure: false }),
    );
  });
});

describe('session and CSRF rejection paths', () => {
  it('rejects an expired identity token before resolving a tenant', async () => {
    const expired = new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    const guard = new AuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as never,
      { getUserFromAccessToken: jest.fn().mockRejectedValue(expired) } as never,
      { resolveForUser: jest.fn() } as never,
      { read: jest.fn() } as never,
      { synchronizeIdentity: jest.fn() } as never,
    );

    await expect(
      guard.canActivate(httpContext({ headers: { authorization: 'Bearer expired' } })),
    ).rejects.toBe(expired);
  });

  it('requires double-submit CSRF for cookie mutations and exempts bearer requests', () => {
    const guard = new CsrfGuard();
    const cookieRequest = {
      method: 'POST',
      headers: { cookie: 'om_csrf_token=csrf-token' },
      header: jest.fn().mockReturnValue('csrf-token'),
    };
    expect(guard.canActivate(httpContext(cookieRequest))).toBe(true);

    cookieRequest.header.mockReturnValue('forged');
    expect(() => guard.canActivate(httpContext(cookieRequest))).toThrow(ForbiddenException);

    expect(
      guard.canActivate(
        httpContext({
          method: 'PATCH',
          headers: { authorization: 'Bearer access-token' },
          header: jest.fn(),
        }),
      ),
    ).toBe(true);
  });
});

describe('membership management rules', () => {
  const ownerContext = {
    user: { id: 'user-owner', email: 'owner@example.test', displayName: 'Owner' },
    tenant: {
      membershipId: 'membership-owner',
      tenantId: 'tenant-a',
      tenantSlug: 'alpha',
      role: MembershipRole.OWNER,
    },
  };

  it('blocks removing the last active OWNER before writing', async () => {
    const membership = {
      id: 'membership-owner',
      tenantId: 'tenant-a',
      userId: 'user-owner',
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
      tenant: { id: 'tenant-a', slug: 'alpha', name: 'Alpha' },
    };
    const transaction = {
      tenantMembership: {
        findFirst: jest.fn().mockResolvedValue(membership),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      withTransaction: (operation: (tx: unknown) => unknown) => operation(transaction),
    };
    const service = new TenantMembershipsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.manage(ownerContext, membership.id, { status: MembershipStatus.SUSPENDED }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.tenantMembership.updateMany).not.toHaveBeenCalled();
  });

  it('does not let an ADMIN change an OWNER membership', async () => {
    const transaction = {
      tenantMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'membership-owner',
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
          tenant: { id: 'tenant-a', slug: 'alpha', name: 'Alpha' },
        }),
      },
    };
    const prisma = {
      withTransaction: (operation: (tx: unknown) => unknown) => operation(transaction),
    };
    const service = new TenantMembershipsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.manage(
        { ...ownerContext, tenant: { ...ownerContext.tenant, role: MembershipRole.ADMIN } },
        'membership-owner',
        { status: MembershipStatus.SUSPENDED },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not let an ADMIN invite an OWNER', async () => {
    const invitations = { invite: jest.fn() };
    const service = new TenantMembershipsService(
      {} as never,
      {} as never,
      invitations as never,
      {} as never,
    );

    await expect(
      service.invite(
        { ...ownerContext, tenant: { ...ownerContext.tenant, role: MembershipRole.ADMIN } },
        { email: 'new-owner@example.test', role: MembershipRole.OWNER },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(invitations.invite).not.toHaveBeenCalled();
  });
});

describe('explicit active tenant selection', () => {
  it('never falls back to the oldest membership when several are active and no default exists', async () => {
    const client = {
      tenantMembership: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'membership-a',
            role: MembershipRole.OWNER,
            tenant: { id: 'tenant-a', slug: 'alpha', name: 'Alpha' },
          },
          {
            id: 'membership-b',
            role: MembershipRole.OWNER,
            tenant: { id: 'tenant-b', slug: 'beta', name: 'Beta' },
          },
        ]),
      },
    };
    const prisma = {
      client: jest.fn().mockReturnValue(client),
      withIdentityContext: jest.fn((_userId, operation) => operation()),
    };
    const service = new TenantAccessService(prisma as never);

    await expect(service.resolveOptionalForUser('user-a')).resolves.toBeNull();
    expect(client.tenantMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isDefault: true }) }),
    );
  });
});
