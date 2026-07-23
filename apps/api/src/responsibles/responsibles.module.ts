import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { ResponsiblesController } from './responsibles.controller';
import { ResponsiblesRepository } from './responsibles.repository';
import { ResponsiblesService } from './responsibles.service';

@Module({
  imports: [AuditModule],
  controllers: [ResponsiblesController],
  providers: [ResponsiblesRepository, ResponsiblesService],
})
export class ResponsiblesModule {}
