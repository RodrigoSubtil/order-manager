import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateResponsibleDto {
  @ApiProperty({ minimum: 1, example: 2, description: 'Version last read by the client.' })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ minLength: 1, maxLength: 160, example: 'Joana Santos' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
