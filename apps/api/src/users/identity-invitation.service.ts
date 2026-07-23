import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

import { AuthenticatedUser } from '../common/auth/authenticated-request';

@Injectable()
export class IdentityInvitationService {
  constructor(private readonly config: ConfigService) {}

  async invite(email: string): Promise<AuthenticatedUser> {
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new ServiceUnavailableException({
        code: 'INVITATIONS_NOT_CONFIGURED',
        message: 'The backend invitation provider is not configured.',
      });
    }

    const client = createClient(this.config.getOrThrow<string>('SUPABASE_URL'), serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const redirectTo = this.config.get<string>('SUPABASE_INVITE_REDIRECT_URL');
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error || !data.user) {
      throw new ServiceUnavailableException({
        code: 'IDENTITY_INVITE_FAILED',
        message: 'The identity provider could not create the invitation.',
      });
    }

    const metadataName =
      data.user.user_metadata?.display_name ?? data.user.user_metadata?.full_name;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      displayName:
        typeof metadataName === 'string' && metadataName.trim()
          ? metadataName.trim()
          : data.user.email?.split('@')[0] || 'Utilizador',
    };
  }
}
