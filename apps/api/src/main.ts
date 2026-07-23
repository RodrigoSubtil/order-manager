import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApplication } from './bootstrap';
import { StructuredLogger } from './common/logging/structured.logger';
import { initializeSentry } from './observability/sentry';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    bufferLogs: true,
  });
  app.useLogger(new StructuredLogger());
  configureApplication(app);

  const config = app.get(ConfigService);
  initializeSentry({
    enabled: config.getOrThrow<boolean>('SENTRY_ENABLED'),
    dsn: config.get<string>('SENTRY_DSN'),
    environment: config.getOrThrow<string>('NODE_ENV'),
    tracesSampleRate: config.getOrThrow<number>('SENTRY_TRACES_SAMPLE_RATE'),
  });
  const host = config.getOrThrow<string>('API_HOST');
  const port = config.getOrThrow<number>('API_PORT');

  await app.listen(port, host);
}

function safeBootstrapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // A failed connection can contain a full database URL. Platform logs must never
  // reveal its credentials, even while making an otherwise opaque boot failure
  // diagnosable during deployment.
  return message.replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, 'postgresql://***@');
}

void bootstrap().catch((error: unknown) => {
  process.stderr.write(`API bootstrap failed: ${safeBootstrapError(error)}\n`);
  process.exitCode = 1;
});
