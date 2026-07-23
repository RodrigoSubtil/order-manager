import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './common/auth/cookies';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { ObservabilityService } from './observability/observability.service';
import { TENANT_CONTEXT_COOKIE } from './tenants/tenant-session.service';

function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Order Manager API')
      .setDescription('Versioned API contract for Order Manager.')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Supabase JWT',
          description: 'Alternative to the HttpOnly access-token cookie.',
        },
        'bearer',
      )
      .addCookieAuth(
        ACCESS_TOKEN_COOKIE,
        { type: 'apiKey', in: 'cookie', description: 'HttpOnly Supabase access-token cookie.' },
        ACCESS_TOKEN_COOKIE,
      )
      .addCookieAuth(
        REFRESH_TOKEN_COOKIE,
        {
          type: 'apiKey',
          in: 'cookie',
          description: 'HttpOnly refresh-token cookie used only by /auth/refresh and /auth/logout.',
        },
        REFRESH_TOKEN_COOKIE,
      )
      .addCookieAuth(
        CSRF_TOKEN_COOKIE,
        {
          type: 'apiKey',
          in: 'cookie',
          description: 'Readable CSRF cookie paired with the X-CSRF-Token header.',
        },
        CSRF_TOKEN_COOKIE,
      )
      .addCookieAuth(
        TENANT_CONTEXT_COOKIE,
        {
          type: 'apiKey',
          in: 'cookie',
          description: 'Signed HttpOnly pointer to a server-validated active membership.',
        },
        TENANT_CONTEXT_COOKIE,
      )
      .build(),
  );
}

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  const corsOrigins = parseCorsOrigins(config.getOrThrow<string>('API_CORS_ORIGINS'));
  const allowAnyOrigin = corsOrigins.includes('*');

  app.use(helmet());
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || allowAnyOrigin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: !allowAnyOrigin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  const observability = app.get(ObservabilityService);
  app.useGlobalInterceptors(new RequestIdInterceptor(observability));
  app.useGlobalFilters(new GlobalExceptionFilter(observability));

  if (config.getOrThrow<boolean>('API_SWAGGER_ENABLED')) {
    const document = createOpenApiDocument(app);

    SwaggerModule.setup('api/v1/docs', app, document, {
      jsonDocumentUrl: 'api/v1/docs-json',
    });
  }
}
