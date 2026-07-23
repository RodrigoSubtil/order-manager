import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { IdentityInvitationService } from './identity-invitation.service';

@Module({
  providers: [UsersService, IdentityInvitationService],
  exports: [UsersService, IdentityInvitationService],
})
export class UsersModule {}
