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
import { CreateResponsibleDto } from './dto/create-responsible.dto';
import { ListResponsiblesDto } from './dto/list-responsibles.dto';
import {
  PaginatedResponsiblesResponseDto,
  ResponsibleResponseDto,
} from './dto/responsible-response.dto';
import { UpdateResponsibleDto } from './dto/update-responsible.dto';
import { ResponsiblesService } from './responsibles.service';

@ApiTags('Responsibles')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@ApiStandardErrors(
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.INTERNAL_SERVER_ERROR,
)
@Controller('responsibles')
export class ResponsiblesController {
  constructor(private readonly responsibles: ResponsiblesService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant responsibles' })
  @ApiOkResponse({
    description: 'Paginated tenant-scoped responsibles.',
    type: PaginatedResponsiblesResponseDto,
  })
  list(@Req() request: AuthenticatedRequest, @Query() query: ListResponsiblesDto) {
    return this.responsibles.list(request.authentication!, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one tenant-scoped responsible' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResponsibleResponseDto })
  @ApiStandardErrors(HttpStatus.NOT_FOUND)
  get(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.responsibles.get(request.authentication!, id);
  }

  @Post()
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Create a tenant responsible' })
  @ApiCreatedResponse({
    description: 'Responsible and audit entry created.',
    type: ResponsibleResponseDto,
  })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateResponsibleDto) {
    return this.responsibles.create(request.authentication!, input, request.requestId);
  }

  @Patch(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Update a responsible with optimistic concurrency' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResponsibleResponseDto })
  @ApiStandardErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateResponsibleDto,
  ) {
    return this.responsibles.update(request.authentication!, id, input, request.requestId);
  }

  @Delete(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a responsible' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({
    name: 'version',
    type: Number,
    minimum: 1,
    required: true,
    description: 'Version last read by the client.',
  })
  @ApiNoContentResponse({ description: 'Responsible soft deleted.' })
  @ApiStandardErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version', ParseIntPipe) version: number,
  ) {
    return this.responsibles.remove(request.authentication!, id, version, request.requestId);
  }
}
