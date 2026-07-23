import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, lastValueFrom, Observable } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { SKIP_TENANT_DATABASE_CONTEXT_KEY } from '../auth/skip-tenant-database-context.decorator';

@Injectable()
export class TenantDatabaseContextInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const skipContext = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_DATABASE_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipContext) return next.handle();
    if (!request.authentication) return next.handle();

    return from(
      this.prisma.withTenantContext(request.authentication, () => lastValueFrom(next.handle())),
    );
  }
}
