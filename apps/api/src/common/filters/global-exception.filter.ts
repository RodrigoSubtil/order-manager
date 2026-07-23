import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';

import { StructuredLogger } from '../logging/structured.logger';
import { ObservabilityService } from '../../observability/observability.service';
import { captureRelevantException } from '../../observability/sentry';

type ErrorResponse = {
  code?: string;
  message?: string | string[];
  details?: unknown;
};

function defaultCode(status: number): string {
  const codes: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
    [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  };

  return codes[status] ?? 'INTERNAL_SERVER_ERROR';
}

function normalizeResponse(response: string | object): ErrorResponse {
  return typeof response === 'string' ? { message: response } : (response as ErrorResponse);
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger();

  constructor(private readonly observability: ObservabilityService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<
      Request & { requestId?: string; traceId?: string; observabilityStartedAt?: number }
    >();
    const requestId = request.requestId ?? randomUUID();
    const traceId = request.traceId ?? requestId;
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? normalizeResponse(exception.getResponse())
      : { message: 'Internal server error.' };
    const validationMessages = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message
      : undefined;

    const code = exceptionResponse.code ?? defaultCode(status);
    const durationMs = request.observabilityStartedAt
      ? Math.round(performance.now() - request.observabilityStartedAt)
      : 0;
    this.observability.recordHttp({
      method: request.method,
      path: request.path,
      statusCode: status,
      durationMs,
    });
    this.observability.recordError({ route: request.path, statusCode: status, code });
    this.logger.error({
      event: 'http_request_failed',
      requestId,
      traceId,
      method: request.method,
      path: request.path,
      statusCode: status,
      code,
      durationMs,
    });
    captureRelevantException(exception, {
      code,
      method: request.method,
      route: request.path,
      requestId,
      statusCode: status,
      traceId,
    });

    response.setHeader('x-request-id', requestId);
    response.setHeader('x-trace-id', traceId);
    response.status(status).json({
      code,
      message: validationMessages ? 'Request validation failed.' : exceptionResponse.message,
      details: exceptionResponse.details ?? validationMessages ?? null,
      traceId,
    });
  }
}
