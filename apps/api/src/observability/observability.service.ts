import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

type Labels = Record<string, string>;

type CounterSnapshot = {
  name: string;
  labels: Labels;
  value: number;
};

type DurationSnapshot = CounterSnapshot & {
  maxMs: number;
};

function stableLabels(labels: Labels): string {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

function safeRoute(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    .replace(/\b\d+\b/g, ':number')
    .slice(0, 160);
}

function criticalOperation(method: string, route: string): string | undefined {
  const normalizedMethod = method.toUpperCase();
  if (route === '/api/v1/auth/login' && normalizedMethod === 'POST') return 'auth.login';
  if (route === '/api/v1/auth/refresh' && normalizedMethod === 'POST') return 'auth.refresh';
  if (route === '/api/v1/orders' && normalizedMethod === 'POST') return 'orders.create';
  if (route.startsWith('/api/v1/orders/') && normalizedMethod === 'PATCH') return 'orders.update';
  if (route.startsWith('/api/v1/orders/') && normalizedMethod === 'DELETE') return 'orders.delete';
  if (route.endsWith('/bulk-delete') && normalizedMethod === 'POST') return 'orders.bulk_delete';
  return undefined;
}

@Injectable()
export class ObservabilityService {
  private readonly counters = new Map<string, CounterSnapshot>();
  private readonly durations = new Map<string, DurationSnapshot>();

  constructor(private readonly config: ConfigService) {}

  recordHttp(input: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
  }): void {
    const route = safeRoute(input.path);
    const status = String(input.statusCode);
    const statusClass = `${Math.floor(input.statusCode / 100)}xx`;
    const labels = { method: input.method.toUpperCase(), route, statusClass };

    this.increment('http_requests_total', { ...labels, status });
    this.observe('http_request_duration_ms', labels, input.durationMs);

    const operation = criticalOperation(input.method, route);
    if (operation) {
      this.increment('critical_operations_total', {
        operation,
        result: input.statusCode >= 400 ? 'failure' : 'success',
      });
      if (operation === 'auth.login') {
        this.increment(
          input.statusCode >= 400 ? 'login_failures_total' : 'login_successes_total',
          {},
        );
      }
    }
  }

  recordError(input: { route: string; statusCode: number; code: string }): void {
    this.increment('http_errors_total', {
      code: input.code,
      route: safeRoute(input.route),
      status: String(input.statusCode),
    });
  }

  recordIntegrationFailure(integration: 'supabase_auth' | 'database'): void {
    this.increment('integration_failures_total', { integration });
  }

  snapshot(token: string | undefined): {
    generatedAt: string;
    counters: CounterSnapshot[];
    durations: DurationSnapshot[];
  } {
    this.assertMetricsAccess(token);
    return {
      generatedAt: new Date().toISOString(),
      counters: [...this.counters.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
      durations: [...this.durations.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    };
  }

  private increment(name: string, labels: Labels): void {
    const key = `${name}|${stableLabels(labels)}`;
    const current = this.counters.get(key);
    if (current) {
      current.value += 1;
      return;
    }
    this.counters.set(key, { name, labels, value: 1 });
  }

  private observe(name: string, labels: Labels, durationMs: number): void {
    const key = `${name}|${stableLabels(labels)}`;
    const current = this.durations.get(key);
    if (current) {
      current.value += 1;
      current.maxMs = Math.max(current.maxMs, durationMs);
      return;
    }
    this.durations.set(key, { name, labels, value: 1, maxMs: durationMs });
  }

  private assertMetricsAccess(token: string | undefined): void {
    if (!this.config.getOrThrow<boolean>('METRICS_ENABLED')) {
      throw new NotFoundException();
    }
    const expected = this.config.getOrThrow<string>('METRICS_AUTH_TOKEN');
    if (
      !token ||
      token.length !== expected.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      throw new UnauthorizedException();
    }
  }
}
