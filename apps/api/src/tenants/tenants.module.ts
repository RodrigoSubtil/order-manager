import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { TenantAccessService } from './tenant-access.service';
import { TenantMembershipsService } from './tenant-memberships.service';
import { TenantSessionService } from './tenant-session.service';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [TenantsController],
  providers: [TenantAccessService, TenantSessionService, TenantMembershipsService],
  exports: [TenantAccessService, TenantSessionService],
})
export class TenantsModule {}
