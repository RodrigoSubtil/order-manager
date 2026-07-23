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
import { CatalogService } from './catalog.service';
import {
  CatalogProductResponseDto,
  PaginatedCatalogProductsResponseDto,
} from './dto/catalog-response.dto';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { ListCatalogProductsDto } from './dto/list-catalog-products.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';

@ApiTags('Catalog')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@ApiStandardErrors(
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.INTERNAL_SERVER_ERROR,
)
@Controller('catalog/products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List active tenant catalog products' })
  @ApiOkResponse({
    description: 'Paginated tenant-scoped catalog.',
    type: PaginatedCatalogProductsResponseDto,
  })
  list(@Req() request: AuthenticatedRequest, @Query() query: ListCatalogProductsDto) {
    return this.catalog.list(request.authentication!, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one tenant-scoped catalog product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CatalogProductResponseDto })
  @ApiStandardErrors(HttpStatus.NOT_FOUND)
  get(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.get(request.authentication!, id);
  }

  @Post()
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Create a tenant catalog product' })
  @ApiCreatedResponse({
    description: 'Catalog product and audit entry created.',
    type: CatalogProductResponseDto,
  })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateCatalogProductDto) {
    return this.catalog.create(request.authentication!, input, request.requestId);
  }

  @Patch(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Update a catalog product with optimistic concurrency' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CatalogProductResponseDto })
  @ApiStandardErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCatalogProductDto,
  ) {
    return this.catalog.update(request.authentication!, id, input, request.requestId);
  }

  @Delete(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a catalog product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({
    name: 'version',
    type: Number,
    minimum: 1,
    required: true,
    description: 'Version last read by the client.',
  })
  @ApiNoContentResponse({ description: 'Catalog product soft deleted.' })
  @ApiStandardErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version', ParseIntPipe) version: number,
  ) {
    return this.catalog.remove(request.authentication!, id, version, request.requestId);
  }
}
