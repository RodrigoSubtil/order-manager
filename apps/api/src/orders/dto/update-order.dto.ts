import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { OrderItemDto } from './order-item.dto';

export class UpdateOrderDto {
  @ApiProperty({ minimum: 1, example: 4, description: 'Version last read by the client.' })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ maxLength: 160, example: 'Maria Costa' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  clientName?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 40, example: null })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true, example: null })
  @IsOptional()
  @IsUUID()
  responsibleId?: string | null;

  @ApiPropertyOptional({ format: 'date', example: '2026-07-21' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
    example: null,
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  deliveryTime?: string | null;

  @ApiPropertyOptional({ type: [OrderItemDto], minItems: 1 })
  @IsOptional()
  @Type(() => OrderItemDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  items?: OrderItemDto[];
}
