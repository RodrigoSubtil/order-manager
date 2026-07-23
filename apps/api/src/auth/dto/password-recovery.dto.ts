import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class PasswordRecoveryDto {
  @ApiProperty({ format: 'email', maxLength: 320, example: 'owner@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
