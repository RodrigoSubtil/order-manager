import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { parseCookies } from '../common/auth/cookies';

export const TENANT_CONTEXT_COOKIE = 'om_tenant_context';

type TenantSessionPayload = {
  sub: string;
  membershipId: string;
  exp: number;
};

@Injectable()
export class TenantSessionService {
  constructor(private readonly config: ConfigService) {}

  read(request: Request, userId: string): string | undefined {
    const token = parseCookies(request.headers.cookie)[TENANT_CONTEXT_COOKIE];
    if (!token) return undefined;

    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature || !this.signaturesMatch(encodedPayload, signature)) {
      throw this.invalidContext();
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as TenantSessionPayload;
      if (
        payload.sub !== userId ||
        payload.exp <= Math.floor(Date.now() / 1000) ||
        !payload.membershipId
      ) {
        throw this.invalidContext();
      }
      return payload.membershipId;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw this.invalidContext();
    }
  }

  issue(response: Response, userId: string, membershipId: string): void {
    const ttlSeconds = this.config.getOrThrow<number>('TENANT_CONTEXT_TTL_SECONDS');
    const payload: TenantSessionPayload = {
      sub: userId,
      membershipId,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${encodedPayload}.${this.sign(encodedPayload)}`;

    response.cookie(TENANT_CONTEXT_COOKIE, token, {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1',
      maxAge: ttlSeconds * 1000,
    });
  }

  clear(response: Response): void {
    response.clearCookie(TENANT_CONTEXT_COOKIE, {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1',
    });
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('SESSION_CONTEXT_SECRET'))
      .update(payload)
      .digest('base64url');
  }

  private signaturesMatch(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private invalidContext(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'TENANT_CONTEXT_INVALID',
      message: 'The active tenant context is invalid or expired.',
    });
  }
}
