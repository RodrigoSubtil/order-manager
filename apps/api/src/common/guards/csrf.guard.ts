import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { AuthenticatedRequest } from '../auth/authenticated-request';
import { CSRF_TOKEN_COOKIE, csrfTokensMatch, parseCookies } from '../auth/cookies';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (request.headers.authorization?.startsWith('Bearer ')) return true;

    const cookies = parseCookies(request.headers.cookie);
    const token = request.header('x-csrf-token');
    if (!csrfTokensMatch(cookies[CSRF_TOKEN_COOKIE], token)) {
      throw new ForbiddenException({
        code: 'CSRF_INVALID',
        message: 'CSRF token is missing or invalid.',
      });
    }
    return true;
  }
}
