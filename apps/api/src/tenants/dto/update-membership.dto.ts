import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { MembershipRole, MembershipStatus } from '../../generated/prisma/client';

const managedStatuses = [
  MembershipStatus.ACTIVE,
  MembershipStatus.SUSPENDED,
  MembershipStatus.REVOKED,
] as const;

export class UpdateMembershipDto {
  @ApiPropertyOptional({ enum: MembershipRole, enumName: 'MembershipRole' })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiPropertyOptional({ enum: managedStatuses })
  @IsOptional()
  @IsEnum(managedStatuses)
  status?: (typeof managedStatuses)[number];
}
