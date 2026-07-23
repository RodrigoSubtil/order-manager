import { LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

type LogContext = Record<string, unknown>;
const sensitiveKeyPattern = /authorization|cookie|email|name|password|phone|secret|session|token/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// A UUID can contain a final group composed only of digits. Do not mistake a
// hexadecimal identifier (or one of its hyphen-separated segments) for a phone number.
const phonePattern = /(?<![A-F0-9-])(?:\+?\d[\s-]?){9,15}(?![A-F0-9-])/gi;
const bearerPattern = /bearer\s+[A-Z0-9._~+/=-]+/gi;
const jwtPattern = /eyJ[A-Z0-9_-]+\.[A-Z0-9_-]+\.[A-Z0-9_-]+/g;

function sanitizeText(value: string): string {
  return value
    .replace(emailPattern, '[redacted-email]')
    .replace(phonePattern, '[redacted-phone]')
    .replace(bearerPattern, 'Bearer [redacted]')
    .replace(jwtPattern, '[redacted-token]');
}

function sanitizeLogValue(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeText(value);
  if (value instanceof Error) {
    return { errorName: value.name, errorMessage: sanitizeText(value.message) };
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeLogValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? '[redacted]' : sanitizeLogValue(nestedValue),
      ]),
    );
  }
  return value;
}

function serializeError(error: unknown): LogContext | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return {
    errorName: error.name,
    errorMessage: sanitizeText(error.message),
  };
}

export class StructuredLogger implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = pino(
      {
        base: undefined,
        level: process.env.LOG_LEVEL ?? 'info',
        formatters: {
          level: (label) => ({ level: label }),
        },
        redact: {
          censor: '[redacted]',
          paths: [
            'password',
            'token',
            'authorization',
            'cookie',
            'message.password',
            'message.token',
            'message.authorization',
            'message.cookie',
          ],
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      process.stdout,
    );
  }

  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, stackOrContext?: string, context?: string): void {
    this.write('error', message, context ?? stackOrContext, serializeError(message));
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(level: string, message: unknown, context?: string, additional?: LogContext): void {
    const entry = {
      message: sanitizeLogValue(message),
      ...(context ? { context } : {}),
      ...(additional ? (sanitizeLogValue(additional) as LogContext) : {}),
    };
    this.logger[level as 'info' | 'error' | 'warn' | 'debug' | 'trace'](entry);
  }
}
