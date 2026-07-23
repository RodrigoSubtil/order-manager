import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory, QuantityUnit } from '../../generated/prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class OrderItemDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Tenant-scoped catalog product reference.' })
  @IsOptional()
  @IsUUID()
  catalogProductId?: string;

  @ApiProperty({
    enum: ProductCategory,
    enumName: 'ProductCategory',
    example: ProductCategory.PASTELARIA,
  })
  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @ApiProperty({ maxLength: 160, example: 'Pastel de nata' })
  @IsString()
  @MaxLength(160)
  productName!: string;

  @ApiProperty({ maxLength: 24, pattern: '^-?\\d+(?:[.,]\\d{1,3})?$', example: '12.5' })
  @IsString()
  @MaxLength(24)
  quantityValue!: string;

  @ApiProperty({ enum: QuantityUnit, enumName: 'QuantityUnit', example: QuantityUnit.UN })
  @IsEnum(QuantityUnit)
  quantityUnit!: QuantityUnit;

  @ApiPropertyOptional({ maxLength: 1000, example: 'Sem canela' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ minimum: 0, example: 0 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  position?: number;
}
