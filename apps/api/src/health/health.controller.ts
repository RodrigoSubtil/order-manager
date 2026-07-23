import { Controller, Get, Headers, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../common/auth/public.decorator';
import { SkipTenantDatabaseContext } from '../common/auth/skip-tenant-database-context.decorator';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Check API liveness' })
  @ApiOkResponse({
    description: 'The API process is running. This endpoint does not check database connectivity.',
    type: HealthResponseDto,
  })
  @ApiStandardErrors(HttpStatus.TOO_MANY_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR)
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  @SkipTenantDatabaseContext()
  @ApiOperation({ summary: 'Check API readiness, including database connectivity' })
  @ApiOkResponse({ description: 'The API and database are ready.', type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'The database is unavailable.' })
  async getReadiness() {
    try {
      await this.prisma.checkConnection();
      return { status: 'ok' as const, timestamp: new Date().toISOString() };
    } catch {
      this.observability.recordIntegrationFailure('database');
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not ready.',
      });
    }
  }

  @Get('metrics')
  @Public()
  @SkipTenantDatabaseContext()
  @ApiOperation({ summary: 'Read internal metrics with an operations token' })
  @ApiHeader({
    name: 'X-Metrics-Token',
    required: true,
    description: 'Operations-only secret. Do not send it from a browser.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['generatedAt', 'counters', 'durations'],
      properties: {
        generatedAt: { type: 'string', format: 'date-time' },
        counters: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'labels', 'value'],
            properties: {
              name: { type: 'string', example: 'http_requests_total' },
              labels: { type: 'object', additionalProperties: { type: 'string' } },
              value: { type: 'number', example: 42 },
            },
          },
        },
        durations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'labels', 'value', 'maxMs'],
            properties: {
              name: { type: 'string', example: 'http_request_duration_ms' },
              labels: { type: 'object', additionalProperties: { type: 'string' } },
              value: { type: 'number', example: 42 },
              maxMs: { type: 'number', example: 180 },
            },
          },
        },
      },
    },
  })
  metrics(@Headers('x-metrics-token') token: string | undefined) {
    return this.observability.snapshot(token);
  }
}
