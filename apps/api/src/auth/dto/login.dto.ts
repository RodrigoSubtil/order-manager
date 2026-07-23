import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ format: 'email', maxLength: 320, example: 'owner@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128, writeOnly: true, example: 'a-safe-password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Keeps the session cookie after the browser is closed. It never stores a password.',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
