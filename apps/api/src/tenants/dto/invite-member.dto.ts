import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, MaxLength } from 'class-validator';

import { MembershipRole } from '../../generated/prisma/client';

export class InviteMemberDto {
  @ApiProperty({ format: 'email', example: 'colaborador@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ enum: MembershipRole, enumName: 'MembershipRole' })
  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
