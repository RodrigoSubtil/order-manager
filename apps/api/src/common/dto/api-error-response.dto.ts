import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Stable machine-readable error code.' })
  code!: string;

  @ApiProperty({ example: 'Request validation failed.' })
  message!: string;

  @ApiProperty({
    type: [String],
    nullable: true,
    example: ['email must be an email'],
    description: 'Validation messages when available; otherwise null.',
  })
  details!: string[] | null;

  @ApiProperty({
    format: 'uuid',
    example: '7a6f8c5d-1a2b-4c3d-9e0f-112233445566',
    description: 'Request correlation identifier used in structured logs.',
  })
  traceId!: string;
}
