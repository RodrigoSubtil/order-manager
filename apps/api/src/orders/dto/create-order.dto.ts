import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ maxLength: 160, example: 'Maria Costa' })
  @IsString()
  @MaxLength(160)
  clientName!: string;

  @ApiPropertyOptional({ maxLength: 40, example: '+351 912 345 678' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Responsible from the authenticated tenant.',
  })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @ApiProperty({ format: 'date', example: '2026-07-20' })
  @IsDateString()
  deliveryDate!: string;

  @ApiPropertyOptional({ pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '14:30' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  deliveryTime?: string;

  @ApiProperty({ type: [OrderItemDto], minItems: 1 })
  @Type(() => OrderItemDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  items!: OrderItemDto[];
}
