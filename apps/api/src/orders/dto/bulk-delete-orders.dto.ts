import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class BulkDeleteOrdersDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-07-01' })
  @IsOptional()
  @ApiProperty({ format: 'date', example: '2026-07-31' })
  @IsDateString()
  from?: string;

  @IsDateString()
  until!: string;

  @ApiProperty({
    example: false,
    description: 'Must be true only when calling the confirmation endpoint.',
  })
  @IsBoolean()
  confirmation!: boolean;
}
