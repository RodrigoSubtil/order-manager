import { ApiProperty } from '@nestjs/swagger';

import { ProductCategory, QuantityUnit } from '../../generated/prisma/client';

export class ReportTenantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'pastelaria-centro' })
  slug!: string;
}

export class DetailedReportResponsibleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Joana Silva' })
  name!: string;
}

export class DetailedReportItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ProductCategory, enumName: 'ProductCategory' })
  category!: ProductCategory;

  @ApiProperty({ example: 'Pastel de nata' })
  productName!: string;

  @ApiProperty({ pattern: '^-?\\d+(?:\\.\\d{1,3})?$', example: '12.5' })
  quantityValue!: string;

  @ApiProperty({ enum: QuantityUnit, enumName: 'QuantityUnit' })
  quantityUnit!: QuantityUnit;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ minimum: 0 })
  position!: number;
}

export class DetailedReportOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ pattern: '^\\d+$', example: '1042' })
  orderNumber!: string;

  @ApiProperty({ example: 'Maria Costa' })
  clientName!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ format: 'date' })
  deliveryDate!: string;

  @ApiProperty({ type: String, nullable: true, pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' })
  deliveryTime!: string | null;

  @ApiProperty({ type: DetailedReportResponsibleDto, nullable: true })
  responsible!: DetailedReportResponsibleDto | null;

  @ApiProperty({ type: [DetailedReportItemDto] })
  items!: DetailedReportItemDto[];
}

export class DetailedReportResponseDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({ format: 'date' })
  from!: string;

  @ApiProperty({ format: 'date' })
  until!: string;

  @ApiProperty({ type: ReportTenantResponseDto })
  tenant!: ReportTenantResponseDto;

  @ApiProperty({ enum: ['DETAILED'], example: 'DETAILED' })
  format!: 'DETAILED';

  @ApiProperty({ type: [DetailedReportOrderDto] })
  orders!: DetailedReportOrderDto[];
}

export class ProductionSummaryItemDto {
  @ApiProperty({ enum: ProductCategory, enumName: 'ProductCategory' })
  category!: ProductCategory;

  @ApiProperty({ example: 'Pastel de nata' })
  productName!: string;

  @ApiProperty({ pattern: '^-?\\d+(?:\\.\\d{1,3})?$', example: '25' })
  quantityValue!: string;

  @ApiProperty({ enum: QuantityUnit, enumName: 'QuantityUnit' })
  quantityUnit!: QuantityUnit;

  @ApiProperty({ minimum: 1, example: 2 })
  orderCount!: number;
}

export class ProductionSummaryGroupDto {
  @ApiProperty({ enum: ProductCategory, enumName: 'ProductCategory' })
  category!: ProductCategory;

  @ApiProperty({ type: [ProductionSummaryItemDto] })
  items!: ProductionSummaryItemDto[];
}

export class ProductionSummaryResponseDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({ format: 'date' })
  from!: string;

  @ApiProperty({ format: 'date' })
  until!: string;

  @ApiProperty({ type: ReportTenantResponseDto })
  tenant!: ReportTenantResponseDto;

  @ApiProperty({ enum: ['PRODUCTION_SUMMARY'], example: 'PRODUCTION_SUMMARY' })
  format!: 'PRODUCTION_SUMMARY';

  @ApiProperty({ minimum: 0, example: 42 })
  orderCount!: number;

  @ApiProperty({ type: [ProductionSummaryGroupDto] })
  groups!: ProductionSummaryGroupDto[];
}
