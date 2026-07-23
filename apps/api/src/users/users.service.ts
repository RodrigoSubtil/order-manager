import { Injectable } from '@nestjs/common';

import { AuthenticatedUser } from '../common/auth/authenticated-request';
import { UserStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async synchronizeIdentity(identity: AuthenticatedUser): Promise<void> {
    await this.prisma.withIdentityContext(identity.id, async () => {
      await this.prisma.client().user.upsert({
        where: { id: identity.id },
        update: {
          displayName: identity.displayName,
          email: identity.email,
          status: UserStatus.ACTIVE,
        },
        create: {
          id: identity.id,
          displayName: identity.displayName,
          email: identity.email,
          status: UserStatus.ACTIVE,
        },
      });
    });
  }
}
