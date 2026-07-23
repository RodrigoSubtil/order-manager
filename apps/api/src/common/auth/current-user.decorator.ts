import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedRequest, AuthenticatedUser } from './authenticated-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.identity ?? request.authentication?.user;
  },
);
