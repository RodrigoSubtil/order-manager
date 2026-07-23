import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AuthenticatedRequest, AuthenticatedUser } from '../common/auth/authenticated-request';
import { ACCESS_TOKEN_COOKIE } from '../common/auth/cookies';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { SkipTenantDatabaseContext } from '../common/auth/skip-tenant-database-context.decorator';
import { TenantOptional } from '../common/auth/tenant-optional.decorator';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { MembershipRole } from '../generated/prisma/client';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import {
  ActiveTenantResponseDto,
  MembershipListResponseDto,
  MembershipResponseDto,
  TenantMemberListResponseDto,
} from './dto/tenant-response.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { TenantMembershipsService } from './tenant-memberships.service';
import { TenantSessionService } from './tenant-session.service';

@ApiTags('Tenants and memberships')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@ApiStandardErrors(
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.INTERNAL_SERVER_ERROR,
)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly memberships: TenantMembershipsService,
    private readonly tenantSession: TenantSessionService,
  ) {}

  @Get('memberships')
  @TenantOptional()
  @ApiOperation({ summary: 'List memberships belonging to the verified identity' })
  @ApiOkResponse({ type: MembershipListResponseDto })
  async listMemberships(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ) {
    const items = await this.memberships.listForUser(user.id);
    return {
      items,
      activeMembershipId: this.tenantSession.read(request, user.id) ?? null,
    };
  }

  @Get('memberships/current-tenant')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'List members of the active company for administration' })
  @ApiOkResponse({ type: TenantMemberListResponseDto })
  async listCurrentTenantMemberships(@Req() request: AuthenticatedRequest) {
    return { items: await this.memberships.listForActiveTenant(request.authentication!) };
  }

  @Post()
  @TenantOptional()
  @ApiOperation({ summary: 'Create a tenant and its first active OWNER membership atomically' })
  @ApiCreatedResponse({ type: MembershipResponseDto })
  async createTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateTenantDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const membership = await this.memberships.createTenant(user, input);
    this.tenantSession.issue(response, user.id, membership.id);
    return membership;
  }

  @Post('switch')
  @TenantOptional()
  @ApiOperation({
    summary: 'Switch company using an opaque membership id validated by the server',
    description: 'tenant_id is not accepted. The resulting active context is signed and HttpOnly.',
  })
  @ApiOkResponse({ type: ActiveTenantResponseDto })
  async switchTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: SwitchTenantDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tenant = await this.memberships.switchTenant(user.id, input.membershipId);
    this.tenantSession.issue(response, user.id, tenant.membershipId);
    return {
      membershipId: tenant.membershipId,
      tenant: {
        id: tenant.tenantId,
        slug: tenant.tenantSlug,
        name: tenant.tenantName ?? tenant.tenantSlug,
      },
      role: tenant.role,
    };
  }

  @Post('memberships/:membershipId/accept')
  @TenantOptional()
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiOperation({ summary: 'Accept an invitation owned by the verified identity' })
  @ApiOkResponse({ type: MembershipResponseDto })
  async acceptInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const membership = await this.memberships.acceptInvitation(user.id, membershipId);
    this.tenantSession.issue(response, user.id, membership.id);
    return membership;
  }

  @Post('memberships/invite')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @SkipTenantDatabaseContext()
  @ApiOperation({ summary: 'Invite a user to the active company' })
  @ApiCreatedResponse({ type: MembershipResponseDto })
  invite(@Req() request: AuthenticatedRequest, @Body() input: InviteMemberDto) {
    return this.memberships.invite(request.authentication!, input, request.requestId);
  }

  @Patch('memberships/:membershipId')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiOperation({ summary: 'Activate, suspend, revoke or change a membership role' })
  @ApiOkResponse({ type: MembershipResponseDto })
  manageMembership(
    @Req() request: AuthenticatedRequest,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() input: UpdateMembershipDto,
  ) {
    return this.memberships.manage(request.authentication!, membershipId, input, request.requestId);
  }
}
