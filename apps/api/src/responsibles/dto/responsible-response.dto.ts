import { ApiProperty } from '@nestjs/swagger';

export class ResponsibleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Tenant that owns this resource. It is derived from the session on writes.',
  })
  tenantId!: string;

  @ApiProperty({ example: 'Joana Silva' })
  name!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ minimum: 0, example: 10 })
  position!: number;

  @ApiProperty({ minimum: 1, example: 1 })
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: null })
  deletedAt!: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  createdById!: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  updatedById!: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true, example: null })
  deletedById!: string | null;
}

export class PaginatedResponsiblesResponseDto {
  @ApiProperty({ type: [ResponsibleResponseDto] })
  items!: ResponsibleResponseDto[];

  @ApiProperty({ minimum: 1, example: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100, example: 25 })
  pageSize!: number;

  @ApiProperty({ minimum: 0, example: 12 })
  total!: number;
}
