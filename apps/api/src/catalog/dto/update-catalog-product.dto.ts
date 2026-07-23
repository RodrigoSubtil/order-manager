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

export class UpdateCatalogProductDto {
  @ApiProperty({ minimum: 1, example: 3, description: 'Version last read by the client.' })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ enum: ProductCategory, enumName: 'ProductCategory' })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiPropertyOptional({ minLength: 1, maxLength: 160, example: 'Pastel de nata grande' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ enum: QuantityUnit, enumName: 'QuantityUnit' })
  @IsOptional()
  @IsEnum(QuantityUnit)
  defaultUnit?: QuantityUnit;

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
