import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory } from '../../generated/prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ReportPeriodQueryDto {
  @ApiProperty({ format: 'date', example: '2026-07-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ format: 'date', example: '2026-07-31' })
  @IsDateString()
  until!: string;

  @ApiPropertyOptional({ enum: ProductCategory, enumName: 'ProductCategory' })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}
