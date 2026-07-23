import { ForbiddenException, Injectable } from '@nestjs/common';

import { MembershipStatus } from '../generated/prisma/client';
import { TenantContext } from '../common/auth/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(userId: string, membershipId?: string): Promise<TenantContext> {
    const tenant = await this.resolveOptionalForUser(userId, membershipId);
    if (!tenant) {
      throw new ForbiddenException({
        code: 'ACTIVE_TENANT_REQUIRED',
        message: 'Select an active company membership before accessing business data.',
      });
    }
    return tenant;
  }

  async resolveOptionalForUser(
    userId: string,
    membershipId?: string,
  ): Promise<TenantContext | null> {
    return this.prisma.withIdentityContext(userId, async () => {
      const select = {
        id: true,
        role: true,
        tenant: { select: { id: true, slug: true, name: true, status: true } },
      } as const;

      if (membershipId) {
        const membership = await this.prisma.client().tenantMembership.findFirst({
          where: { id: membershipId, userId, status: MembershipStatus.ACTIVE },
          select,
        });
        if (!membership || membership.tenant.status !== 'ACTIVE') {
          throw new ForbiddenException({
            code: 'TENANT_MEMBERSHIP_INACTIVE',
            message: 'The selected company membership is not active.',
          });
        }
        return this.toContext(membership);
      }

      const defaultMembership = await this.prisma.client().tenantMembership.findFirst({
        where: { userId, status: MembershipStatus.ACTIVE, isDefault: true },
        select,
      });
      if (defaultMembership?.tenant.status === 'ACTIVE') return this.toContext(defaultMembership);

      const activeMemberships = await this.prisma.client().tenantMembership.findMany({
        where: { userId, status: MembershipStatus.ACTIVE, tenant: { status: 'ACTIVE' } },
        take: 2,
        select,
      });
      return activeMemberships.length === 1 ? this.toContext(activeMemberships[0]) : null;
    });
  }

  private toContext(membership: {
    id: string;
    role: TenantContext['role'];
    tenant: { id: string; slug: string; name: string };
  }): TenantContext {
    return {
      membershipId: membership.id,
      tenantId: membership.tenant.id,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      role: membership.role,
    };
  }
}
