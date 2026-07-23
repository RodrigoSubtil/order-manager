import * as Sentry from '@sentry/node';

type SentryConfiguration = {
  dsn?: string;
  enabled: boolean;
  environment: string;
  tracesSampleRate: number;
};

type SafeSentryContext = {
  code: string;
  method: string;
  route: string;
  requestId: string;
  statusCode: number;
  traceId: string;
};

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /(?<![A-F0-9-])(?:\+?\d[\s-]?){9,15}(?![A-F0-9-])/gi;
const tokenPattern = /bearer\s+[A-Z0-9._~+/=-]+|eyJ[A-Z0-9_-]+\.[A-Z0-9_-]+\.[A-Z0-9_-]+/gi;
let sentryEnabled = false;

function sanitizeText(value: string): string {
  return value
    .replace(emailPattern, '[redacted-email]')
    .replace(phonePattern, '[redacted-phone]')
    .replace(tokenPattern, '[redacted-token]');
}

function safeError(exception: unknown): Error {
  if (exception instanceof Error) {
    const error = new Error(sanitizeText(exception.message));
    error.name = exception.name;
    return error;
  }
  return new Error('Unhandled non-error exception.');
}

export function initializeSentry(configuration: SentryConfiguration): void {
  if (!configuration.enabled || !configuration.dsn) return;

  Sentry.init({
    dsn: configuration.dsn,
    environment: configuration.environment,
    sendDefaultPii: false,
    tracesSampleRate: configuration.tracesSampleRate,
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
  sentryEnabled = true;
}

export function captureRelevantException(exception: unknown, context: SafeSentryContext): void {
  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    scope.setTags({
      code: context.code,
      method: context.method,
      route: context.route,
      request_id: context.requestId,
      status_code: String(context.statusCode),
      trace_id: context.traceId,
    });
    Sentry.captureException(safeError(exception));
  });
}
