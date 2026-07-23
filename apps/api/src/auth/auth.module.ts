import { Module } from '@nestjs/common';

import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { SupabaseAuthService } from './supabase-auth.service';

@Module({
  imports: [TenantsModule, UsersModule],
  controllers: [AuthController],
  providers: [SupabaseAuthService],
  exports: [SupabaseAuthService],
})
export class AuthModule {}
