import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../dto/api-error-response.dto';

type DocumentedErrorStatus =
  | HttpStatus.BAD_REQUEST
  | HttpStatus.UNAUTHORIZED
  | HttpStatus.FORBIDDEN
  | HttpStatus.NOT_FOUND
  | HttpStatus.CONFLICT
  | HttpStatus.TOO_MANY_REQUESTS
  | HttpStatus.INTERNAL_SERVER_ERROR;

const descriptions: Record<DocumentedErrorStatus, string> = {
  [HttpStatus.BAD_REQUEST]: 'Invalid request or validation failure.',
  [HttpStatus.UNAUTHORIZED]: 'Missing, expired or invalid session.',
  [HttpStatus.FORBIDDEN]: 'Insufficient role or invalid CSRF token.',
  [HttpStatus.NOT_FOUND]: 'Tenant-scoped resource not found.',
  [HttpStatus.CONFLICT]: 'Optimistic concurrency version conflict.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Rate limit exceeded.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Unexpected server error.',
};

export function ApiStandardErrors(...statuses: DocumentedErrorStatus[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: descriptions[status],
        type: ApiErrorResponseDto,
      }),
    ),
  );
}
