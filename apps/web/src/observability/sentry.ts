import * as Sentry from '@sentry/react';

type ApiFailure = Error & { status?: number; code?: string; traceId?: string };

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /(?<![A-F0-9-])(?:\+?\d[\s-]?){9,15}(?![A-F0-9-])/gi;
const tokenPattern = /bearer\s+[A-Z0-9._~+/=-]+|eyJ[A-Z0-9_-]+\.[A-Z0-9_-]+\.[A-Z0-9_-]+/gi;

function sanitizeText(value: string): string {
  return value
    .replace(emailPattern, '[redacted-email]')
    .replace(phonePattern, '[redacted-phone]')
    .replace(tokenPattern, '[redacted-token]');
}

export function initializeFrontendSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (import.meta.env.VITE_SENTRY_ENABLED !== 'true' || !dsn) return;

  const sampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.05');
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: Number.isFinite(sampleRate) ? Math.min(Math.max(sampleRate, 0), 1) : 0.05,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
        ...breadcrumb,
        data: undefined,
      }));
      return event;
    },
  });
}

export function captureFrontendException(error: unknown, source: 'query' | 'mutation'): void {
  const candidate = error as ApiFailure | null;
  const safeError = new Error(
    error instanceof Error ? sanitizeText(error.message) : 'Unhandled frontend error.',
  );
  Sentry.withScope((scope) => {
    scope.setTag('source', source);
    if (candidate?.status) scope.setTag('http_status', String(candidate.status));
    if (candidate?.code) scope.setTag('api_code', candidate.code);
    if (candidate?.traceId) scope.setTag('api_trace_id', candidate.traceId);
    Sentry.captureException(safeError);
  });
}
