import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { AuthenticatedUser } from '../common/auth/authenticated-request';
import { SessionTokens } from '../common/auth/cookies';
import { ObservabilityService } from '../observability/observability.service';

@Injectable()
export class SupabaseAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthenticatedUser; session: SessionTokens }> {
    const { data, error } = await this.execute(() =>
      this.client().auth.signInWithPassword({ email, password }),
    );
    if (error || !data.user || !data.session) throw this.invalidSession();
    return { user: this.mapUser(data.user), session: this.mapSession(data.session) };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ user: AuthenticatedUser; session: SessionTokens }> {
    const { data, error } = await this.execute(() =>
      this.client().auth.refreshSession({ refresh_token: refreshToken }),
    );
    if (error || !data.user || !data.session) throw this.invalidSession();
    return { user: this.mapUser(data.user), session: this.mapSession(data.session) };
  }

  async logout(accessToken: string | undefined, refreshToken: string | undefined): Promise<void> {
    if (!accessToken || !refreshToken) return;
    const client = this.client();
    const { error: setSessionError } = await this.execute(() =>
      client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
    );
    if (!setSessionError) await this.execute(() => client.auth.signOut({ scope: 'local' }));
  }

  async requestPasswordRecovery(email: string): Promise<void> {
    const redirectTo = this.config.get<string>('SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL');
    const { error } = await this.execute(() =>
      this.client().auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined),
    );
    if (error) {
      this.observability.recordIntegrationFailure('supabase_auth');
    }
  }

  async getUserFromAccessToken(accessToken: string): Promise<AuthenticatedUser> {
    const { data, error } = await this.execute(() => this.client().auth.getUser(accessToken));
    if (error || !data.user) throw this.invalidSession();
    return this.mapUser(data.user);
  }

  private client(): SupabaseClient {
    return createClient(
      this.config.getOrThrow<string>('SUPABASE_URL'),
      this.config.getOrThrow<string>('SUPABASE_ANON_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
  }

  private mapUser(user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }): AuthenticatedUser {
    const metadataName = user.user_metadata?.display_name ?? user.user_metadata?.full_name;
    const fallbackName = user.email?.split('@')[0] || 'Utilizador';
    return {
      id: user.id,
      email: user.email ?? null,
      displayName:
        typeof metadataName === 'string' && metadataName.trim()
          ? metadataName.trim()
          : fallbackName,
    };
  }

  private mapSession(session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }): SessionTokens {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
    };
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid or expired credentials.',
    });
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      this.observability.recordIntegrationFailure('supabase_auth');
      throw this.invalidSession();
    }
  }
}
