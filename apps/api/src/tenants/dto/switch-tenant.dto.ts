import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchTenantDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Opaque membership identifier. tenant_id is never accepted from the frontend.',
  })
  @IsUUID()
  membershipId!: string;
}
