import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory } from '../../generated/prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum OrderStatusFilter {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({ format: 'date', example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  until?: string;
  @ApiPropertyOptional({ enum: ProductCategory, enumName: 'ProductCategory' })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;
  @ApiPropertyOptional({
    enum: OrderStatusFilter,
    enumName: 'OrderStatusFilter',
    default: OrderStatusFilter.ACTIVE,
  })
  @IsOptional()
  @IsEnum(OrderStatusFilter)
  status: OrderStatusFilter = OrderStatusFilter.ACTIVE;
  @ApiPropertyOptional({
    example: 'maria',
    description: 'Search client, phone, responsible or product.',
  })
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}
