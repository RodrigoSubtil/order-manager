import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AuthenticatedRequest } from '../common/auth/authenticated-request';
import { ACCESS_TOKEN_COOKIE } from '../common/auth/cookies';
import { Roles } from '../common/auth/roles.decorator';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { MembershipRole } from '../generated/prisma/client';
import { BulkDeleteOrdersDto } from './dto/bulk-delete-orders.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import {
  BulkDeleteOrdersPreviewResponseDto,
  BulkDeleteOrdersResultDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto/order-response.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@ApiStandardErrors(
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.INTERNAL_SERVER_ERROR,
)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with server-side filters and pagination' })
  @ApiOkResponse({
    description: 'Tenant-scoped paginated orders.',
    type: PaginatedOrdersResponseDto,
  })
  list(@Req() request: AuthenticatedRequest, @Query() query: ListOrdersQueryDto) {
    return this.orders.list(request.authentication!, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant-scoped order with its items' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrors(HttpStatus.NOT_FOUND)
  get(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.get(request.authentication!, id);
  }

  @Post()
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.OPERATOR)
  @ApiOperation({ summary: 'Create an order and all items atomically' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateOrderDto) {
    return this.orders.create(request.authentication!, input, request.requestId);
  }

  @Patch(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.OPERATOR)
  @ApiOperation({ summary: 'Update an order with optimistic concurrency' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateOrderDto,
  ) {
    return this.orders.update(request.authentication!, id, input, request.requestId);
  }

  @Delete(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete one order' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({
    name: 'version',
    type: Number,
    minimum: 1,
    required: true,
    description: 'Version last read by the client.',
  })
  @ApiNoContentResponse({ description: 'Order soft deleted.' })
  @ApiStandardErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version', ParseIntPipe) version: number,
  ) {
    return this.orders.remove(request.authentication!, id, version, request.requestId);
  }

  @Post('bulk-delete/preview')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview orders affected by a date-range soft delete' })
  @ApiOkResponse({ type: BulkDeleteOrdersPreviewResponseDto })
  previewBulkDelete(@Req() request: AuthenticatedRequest, @Body() input: BulkDeleteOrdersDto) {
    return this.orders.previewBulkDelete(request.authentication!, input);
  }

  @Post('bulk-delete/confirm')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a date-range soft delete after preview' })
  @ApiOkResponse({ type: BulkDeleteOrdersResultDto })
  confirmBulkDelete(@Req() request: AuthenticatedRequest, @Body() input: BulkDeleteOrdersDto) {
    return this.orders.confirmBulkDelete(request.authentication!, input, request.requestId);
  }
}
