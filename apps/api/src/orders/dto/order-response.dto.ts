import { ApiProperty } from '@nestjs/swagger';

import { ProductCategory, QuantityUnit } from '../../generated/prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  catalogProductId!: string | null;

  @ApiProperty({ enum: ProductCategory, enumName: 'ProductCategory' })
  category!: ProductCategory;

  @ApiProperty({ example: 'Pastel de nata' })
  productName!: string;

  @ApiProperty({ pattern: '^-?\\d+(?:\\.\\d{1,3})?$', example: '12.5' })
  quantityValue!: string;

  @ApiProperty({ enum: QuantityUnit, enumName: 'QuantityUnit' })
  quantityUnit!: QuantityUnit;

  @ApiProperty({ type: String, nullable: true, example: null })
  notes!: string | null;

  @ApiProperty({ minimum: 0, example: 0 })
  position!: number;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    pattern: '^\\d+$',
    example: '1042',
    description: 'Sequential order number represented as a string.',
  })
  orderNumber!: string;

  @ApiProperty({ example: 'Maria Costa' })
  clientName!: string;

  @ApiProperty({ type: String, nullable: true, example: '+351 912 345 678' })
  phone!: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  responsibleId!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Joana Silva' })
  responsibleName!: string | null;

  @ApiProperty({ format: 'date', example: '2026-07-20' })
  deliveryDate!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
    example: '14:30',
  })
  deliveryTime!: string | null;

  @ApiProperty({ minimum: 1, example: 1 })
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty({ minimum: 1, example: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100, example: 25 })
  pageSize!: number;

  @ApiProperty({ minimum: 0, example: 87 })
  total!: number;
}

export class BulkDeleteOrderPreviewItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ pattern: '^\\d+$', example: '1042' })
  orderNumber!: string;

  @ApiProperty({ example: 'Maria Costa' })
  clientName!: string;

  @ApiProperty({ format: 'date', example: '2026-07-20' })
  deliveryDate!: string;
}

export class BulkDeleteOrdersPreviewResponseDto {
  @ApiProperty({ minimum: 0, example: 150 })
  total!: number;

  @ApiProperty({ type: [BulkDeleteOrderPreviewItemDto], maxItems: 100 })
  preview!: BulkDeleteOrderPreviewItemDto[];

  @ApiProperty({
    example: true,
    description: 'True when total is larger than the 100-item preview.',
  })
  truncated!: boolean;
}

export class BulkDeleteOrdersResultDto {
  @ApiProperty({ minimum: 0, example: 150 })
  deleted!: number;
}
