import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { MembershipRole, MembershipStatus, TenantStatus } from '../src/generated/prisma/client';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { csrfTokensMatch } from '../src/common/auth/cookies';
import { RoleGuard } from '../src/common/guards/role.guard';
import { TenantAccessService } from '../src/tenants/tenant-access.service';

function httpContext(request: Record<string, unknown>): ExecutionContextHost {
  const context = new ExecutionContextHost([]);
  jest.spyOn(context, 'switchToHttp').mockReturnValue({ getRequest: () => request } as never);
  return context;
}

describe('authentication and tenant authorization', () => {
  it('derives the tenant from the verified subject, not a forged client tenant_id', async () => {
    const prisma = {
      client: jest.fn().mockReturnValue({
        tenantMembership: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'membership-a',
            role: MembershipRole.OPERATOR,
            tenant: { id: 'tenant-a', slug: 'alpha', name: 'Alpha', status: TenantStatus.ACTIVE },
          }),
        },
      }),
      withIdentityContext: jest.fn((_userId, operation) => operation()),
    };
    const tenants = new TenantAccessService(prisma as never);
    const supabase = {
      getUserFromAccessToken: jest
        .fn()
        .mockResolvedValue({ id: 'user-a', email: 'a@example.test', displayName: 'User A' }),
    };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const tenantSession = { read: jest.fn().mockReturnValue('membership-a') };
    const users = { synchronizeIdentity: jest.fn() };
    const guard = new AuthGuard(
      reflector as never,
      supabase as never,
      tenants,
      tenantSession as never,
      users as never,
    );
    const request: {
      headers: { authorization: string };
      body: { tenant_id: string };
      authentication?: unknown;
    } = {
      headers: { authorization: 'Bearer valid-token' },
      body: { tenant_id: 'tenant-b' },
    };

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);

    expect(prisma.client().tenantMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'membership-a', userId: 'user-a', status: MembershipStatus.ACTIVE },
      }),
    );
    expect((request.authentication as { tenant: { tenantId: string } }).tenant.tenantId).toBe(
      'tenant-a',
    );
  });

  it('rejects a request without a verified session token', async () => {
    const guard = new AuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(guard.canActivate(httpContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an operator from an owner/admin-only action', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([MembershipRole.OWNER, MembershipRole.ADMIN]),
    };
    const guard = new RoleGuard(reflector as never);
    const request = {
      authentication: {
        user: { id: 'user-a', email: null, displayName: 'User A' },
        tenant: {
          membershipId: 'membership-a',
          tenantId: 'tenant-a',
          tenantSlug: 'alpha',
          role: MembershipRole.OPERATOR,
        },
      },
    };

    expect(() => guard.canActivate(httpContext(request))).toThrow(ForbiddenException);
  });

  it('accepts matching CSRF tokens and rejects mismatches', () => {
    expect(csrfTokensMatch('same-token', 'same-token')).toBe(true);
    expect(csrfTokensMatch('same-token', 'other-token')).toBe(false);
    expect(csrfTokensMatch(undefined, 'same-token')).toBe(false);
  });
});
