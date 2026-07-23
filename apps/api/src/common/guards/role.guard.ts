import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { MembershipRole } from '../../generated/prisma/client';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { ROLES_KEY } from '../auth/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authentication || !roles.includes(request.authentication.tenant.role)) {
      throw new ForbiddenException({
        code: 'ROLE_FORBIDDEN',
        message: 'Insufficient tenant permission.',
      });
    }
    return true;
  }
}
