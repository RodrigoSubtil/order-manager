import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { validateEnvironment } from './config/environment.validation';
import { AuthGuard } from './common/guards/auth.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { RoleGuard } from './common/guards/role.guard';
import { TenantDatabaseContextInterceptor } from './common/interceptors/tenant-database-context.interceptor';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { ObservabilityModule } from './observability/observability.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { ResponsiblesModule } from './responsibles/responsibles.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('API_RATE_LIMIT_TTL_MS'),
            limit: config.getOrThrow<number>('API_RATE_LIMIT_LIMIT'),
          },
        ],
      }),
    }),
    PrismaModule,
    ObservabilityModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    OrdersModule,
    CatalogModule,
    ResponsiblesModule,
    ReportsModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantDatabaseContextInterceptor,
    },
  ],
})
export class AppModule {}
