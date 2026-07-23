import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { ObservabilityService } from '../src/observability/observability.service';

describe('ObservabilityService', () => {
  function createService(overrides: Record<string, unknown> = {}) {
    const values = {
      METRICS_ENABLED: true,
      METRICS_AUTH_TOKEN: 'a'.repeat(32),
      ...overrides,
    };
    return new ObservabilityService({
      getOrThrow: jest.fn((key: string) => values[key as keyof typeof values]),
    } as never);
  }

  it('records aggregate HTTP, login and operation metrics without identifiers or request content', () => {
    const service = createService();
    service.recordHttp({
      method: 'POST',
      path: '/api/v1/orders',
      statusCode: 201,
      durationMs: 42,
    });

    const snapshot = service.snapshot('a'.repeat(32));
    expect(snapshot.counters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'http_requests_total',
          labels: expect.objectContaining({ route: '/api/v1/orders' }),
        }),
        expect.objectContaining({
          name: 'critical_operations_total',
          labels: { operation: 'orders.create', result: 'success' },
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain('clientName');
  });

  it('does not expose metrics when disabled or when the operations token is invalid', () => {
    expect(() => createService({ METRICS_ENABLED: false }).snapshot('a'.repeat(32))).toThrow(
      NotFoundException,
    );
    expect(() => createService().snapshot('wrong-token')).toThrow(UnauthorizedException);
  });
});
