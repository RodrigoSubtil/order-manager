import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApplication } from './bootstrap';
import { StructuredLogger } from './common/logging/structured.logger';
import { initializeSentry } from './observability/sentry';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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

void bootstrap();
