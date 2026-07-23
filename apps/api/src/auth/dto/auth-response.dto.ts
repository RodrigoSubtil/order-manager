import { ApiProperty } from '@nestjs/swagger';

import { MembershipRole } from '../../generated/prisma/client';

export class CsrfResponseDto {
  @ApiProperty({
    example: 'c29tZS1yYW5kb20tY3NyZi10b2tlbg',
    description: 'Token that must also be sent in the X-CSRF-Token header for session mutations.',
  })
  csrfToken!: string;
}

export class PasswordRecoveryResponseDto {
  @ApiProperty({ example: 'If the account exists, recovery instructions will be sent.' })
  message!: string;
}

export class AuthenticatedUserResponseDto {
  @ApiProperty({ format: 'uuid', example: '2b8ec2c6-e0d1-45d0-9d51-7c0fbfd40d8b' })
  id!: string;

  @ApiProperty({ type: String, format: 'email', nullable: true, example: 'owner@example.com' })
  email!: string | null;

  @ApiProperty({ example: 'Ana Silva' })
  displayName!: string;
}

export class AuthenticatedTenantResponseDto {
  @ApiProperty({ format: 'uuid', example: '58f3324a-4952-4c08-90e2-a8159064aa01' })
  id!: string;

  @ApiProperty({ example: 'pastelaria-centro' })
  slug!: string;
}

export class SessionResponseDto {
  @ApiProperty({ type: AuthenticatedUserResponseDto })
  user!: AuthenticatedUserResponseDto;

  @ApiProperty({ type: AuthenticatedTenantResponseDto, nullable: true })
  tenant!: AuthenticatedTenantResponseDto | null;

  @ApiProperty({
    enum: MembershipRole,
    enumName: 'MembershipRole',
    nullable: true,
    example: MembershipRole.OWNER,
  })
  role!: MembershipRole | null;

  @ApiProperty({ example: false })
  tenantSelectionRequired!: boolean;
}
