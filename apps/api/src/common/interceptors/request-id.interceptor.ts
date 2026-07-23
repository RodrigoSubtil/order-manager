import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { StructuredLogger } from '../logging/structured.logger';
import { ObservabilityService } from '../../observability/observability.service';

type RequestWithId = Request & {
  requestId?: string;
  traceId?: string;
  observabilityStartedAt?: number;
};

function requestIdentifier(value: string | undefined): string | undefined {
  return value && /^[A-Za-z0-9._-]{1,128}$/.test(value) ? value : undefined;
}

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger();

  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const requestId = requestIdentifier(request.header('x-request-id')) ?? randomUUID();
    const traceId = requestIdentifier(request.header('x-trace-id')) ?? requestId;
    const startedAt = performance.now();

    request.requestId = requestId;
    request.traceId = traceId;
    request.observabilityStartedAt = startedAt;
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-trace-id', traceId);

    return next.handle().pipe(
      tap(() => {
        response.setHeader('x-request-id', requestId);
        response.setHeader('x-trace-id', traceId);
        const durationMs = Math.round(performance.now() - startedAt);
        this.observability.recordHttp({
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs,
        });
        this.logger.log({
          event: 'http_request_completed',
          requestId,
          traceId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs,
        });
      }),
    );
  }
}
