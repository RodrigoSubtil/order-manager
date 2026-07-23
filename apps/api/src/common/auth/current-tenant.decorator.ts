import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedRequest, TenantContext } from './authenticated-request';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authentication?.tenant;
  },
);
