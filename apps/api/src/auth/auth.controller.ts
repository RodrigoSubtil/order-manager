import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

import { AuthenticatedUser, TenantContext } from '../common/auth/authenticated-request';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  isPersistentSession,
  issueCsrfCookie,
  parseCookies,
  setSessionCookies,
} from '../common/auth/cookies';
import { CurrentTenant } from '../common/auth/current-tenant.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Public } from '../common/auth/public.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { TenantSessionService } from '../tenants/tenant-session.service';
import { UsersService } from '../users/users.service';
import {
  CsrfResponseDto,
  PasswordRecoveryResponseDto,
  SessionResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { SupabaseAuthService } from './supabase-auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: SupabaseAuthService,
    private readonly tenants: TenantAccessService,
    private readonly tenantSession: TenantSessionService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Get('csrf')
  @Public()
  @ApiOperation({ summary: 'Issue a CSRF token for cookie-based session operations' })
  @ApiOkResponse({
    type: CsrfResponseDto,
    headers: {
      'Set-Cookie': {
        description: `Sets the readable ${CSRF_TOKEN_COOKIE} cookie.`,
        schema: { type: 'string' },
      },
    },
  })
  @ApiStandardErrors(HttpStatus.TOO_MANY_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR)
  csrf(@Res({ passthrough: true }) response: Response) {
    return { csrfToken: issueCsrfCookie(response, this.config) };
  }

  @Post('login')
  @Public()
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(CSRF_TOKEN_COOKIE)
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: `Must match the ${CSRF_TOKEN_COOKIE} cookie.`,
  })
  @ApiOperation({ summary: 'Sign in through Supabase Auth and set HttpOnly session cookies' })
  @ApiOkResponse({
    description: 'Session cookies set; tokens are never returned in the body.',
    type: SessionResponseDto,
    headers: {
      'Set-Cookie': {
        description: `Sets ${ACCESS_TOKEN_COOKIE} and ${REFRESH_TOKEN_COOKIE} as HttpOnly cookies.`,
        schema: { type: 'string' },
      },
    },
  })
  @ApiStandardErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  )
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(input.email, input.password);
    await this.users.synchronizeIdentity(result.user);
    const membershipId = this.tenantSession.read(request, result.user.id);
    const tenant = await this.tenants.resolveOptionalForUser(result.user.id, membershipId);
    setSessionCookies(response, this.config, result.session, input.rememberMe ?? false);
    if (tenant) this.tenantSession.issue(response, result.user.id, tenant.membershipId);
    return this.sessionResponse(result.user, tenant);
  }

  @Post('password-recovery')
  @Public()
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiCookieAuth(CSRF_TOKEN_COOKIE)
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: `Must match the ${CSRF_TOKEN_COOKIE} cookie.`,
  })
  @ApiOperation({
    summary: 'Request password recovery instructions without revealing account existence',
  })
  @ApiAcceptedResponse({ type: PasswordRecoveryResponseDto })
  @ApiStandardErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  )
  async requestPasswordRecovery(@Body() input: PasswordRecoveryDto) {
    await this.auth.requestPasswordRecovery(input.email);
    return { message: 'If the account exists, recovery instructions will be sent.' };
  }

  @Post('refresh')
  @Public()
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiCookieAuth(CSRF_TOKEN_COOKIE)
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: `Must match the ${CSRF_TOKEN_COOKIE} cookie.`,
  })
  @ApiOperation({ summary: 'Refresh the Supabase session and rotate HttpOnly cookies' })
  @ApiOkResponse({
    type: SessionResponseDto,
    headers: {
      'Set-Cookie': {
        description: `Rotates ${ACCESS_TOKEN_COOKIE} and ${REFRESH_TOKEN_COOKIE}.`,
        schema: { type: 'string' },
      },
    },
  })
  @ApiStandardErrors(
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  )
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = parseCookies(request.headers.cookie)[REFRESH_TOKEN_COOKIE];
    const result = await this.auth.refresh(refreshToken ?? '');
    await this.users.synchronizeIdentity(result.user);
    const membershipId = this.tenantSession.read(request, result.user.id);
    const tenant = await this.tenants.resolveOptionalForUser(result.user.id, membershipId);
    setSessionCookies(
      response,
      this.config,
      result.session,
      isPersistentSession(request.headers.cookie),
    );
    if (tenant) this.tenantSession.issue(response, result.user.id, tenant.membershipId);
    return this.sessionResponse(result.user, tenant);
  }

  @Post('logout')
  @Public()
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiCookieAuth(CSRF_TOKEN_COOKIE)
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: `Must match the ${CSRF_TOKEN_COOKIE} cookie.`,
  })
  @ApiOperation({ summary: 'End the Supabase session and clear local session cookies' })
  @ApiNoContentResponse({
    description: 'Session ended and cookies cleared.',
    headers: {
      'Set-Cookie': { description: 'Expires both session cookies.', schema: { type: 'string' } },
    },
  })
  @ApiStandardErrors(
    HttpStatus.FORBIDDEN,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  )
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const cookies = parseCookies(request.headers.cookie);
    await this.auth.logout(cookies[ACCESS_TOKEN_COOKIE], cookies[REFRESH_TOKEN_COOKIE]);
    clearSessionCookies(response, this.config);
    this.tenantSession.clear(response);
  }

  @Get('me')
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Return verified identity, active tenant and role' })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiStandardErrors(
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  )
  me(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tenant: TenantContext) {
    return this.sessionResponse(user, tenant);
  }

  private sessionResponse(user: AuthenticatedUser, tenant: TenantContext | null) {
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      tenant: tenant ? { id: tenant.tenantId, slug: tenant.tenantSlug } : null,
      role: tenant?.role ?? null,
      tenantSelectionRequired: !tenant,
    };
  }
}
