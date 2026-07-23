import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MembershipRole, MembershipStatus } from '../../generated/prisma/client';

export class TenantSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'pastelaria-centro' })
  slug!: string;

  @ApiProperty({ example: 'Pastelaria Centro' })
  name!: string;
}

export class MembershipResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: MembershipRole, enumName: 'MembershipRole' })
  role!: MembershipRole;

  @ApiProperty({ enum: MembershipStatus, enumName: 'MembershipStatus' })
  status!: MembershipStatus;

  @ApiProperty({ type: TenantSummaryDto })
  tenant!: TenantSummaryDto;
}

export class ActiveTenantResponseDto {
  @ApiProperty({ format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ type: TenantSummaryDto })
  tenant!: TenantSummaryDto;

  @ApiProperty({ enum: MembershipRole, enumName: 'MembershipRole' })
  role!: MembershipRole;
}

export class MembershipListResponseDto {
  @ApiProperty({ type: MembershipResponseDto, isArray: true })
  items!: MembershipResponseDto[];

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  activeMembershipId!: string | null;
}

export class TenantMemberUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Martins' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    format: 'email',
    nullable: true,
    example: 'ana@example.com',
  })
  email!: string | null;
}

export class TenantMemberResponseDto extends MembershipResponseDto {
  @ApiProperty({ type: TenantMemberUserDto })
  user!: TenantMemberUserDto;
}

export class TenantMemberListResponseDto {
  @ApiProperty({ type: TenantMemberResponseDto, isArray: true })
  items!: TenantMemberResponseDto[];
}
