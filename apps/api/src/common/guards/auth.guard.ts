import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SupabaseAuthService } from '../../auth/supabase-auth.service';
import { TenantAccessService } from '../../tenants/tenant-access.service';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { ACCESS_TOKEN_COOKIE, parseCookies } from '../auth/cookies';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { TENANT_OPTIONAL_KEY } from '../auth/tenant-optional.decorator';
import { TenantSessionService } from '../../tenants/tenant-session.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseAuth: SupabaseAuthService,
    private readonly tenantAccess: TenantAccessService,
    private readonly tenantSession: TenantSessionService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.readAccessToken(request);
    if (!accessToken)
      throw new UnauthorizedException({
        code: 'SESSION_REQUIRED',
        message: 'Authentication is required.',
      });

    const user = await this.supabaseAuth.getUserFromAccessToken(accessToken);
    await this.users.synchronizeIdentity(user);
    request.identity = user;

    const tenantOptional = this.reflector.getAllAndOverride<boolean>(TENANT_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (tenantOptional) return true;

    const membershipId = this.tenantSession.read(request, user.id);
    const tenant = await this.tenantAccess.resolveForUser(user.id, membershipId);
    request.authentication = { user, tenant };
    return true;
  }

  private readAccessToken(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer '))
      return authorization.slice('Bearer '.length).trim() || undefined;
    return parseCookies(request.headers.cookie)[ACCESS_TOKEN_COOKIE];
  }
}
