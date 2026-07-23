import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory, QuantityUnit } from '../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCatalogProductDto {
  @ApiProperty({
    enum: ProductCategory,
    enumName: 'ProductCategory',
    example: ProductCategory.PASTELARIA,
  })
  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @ApiProperty({ minLength: 1, maxLength: 160, example: 'Pastel de nata' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ enum: QuantityUnit, enumName: 'QuantityUnit', default: QuantityUnit.UN })
  @IsOptional()
  @IsEnum(QuantityUnit)
  defaultUnit?: QuantityUnit;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
