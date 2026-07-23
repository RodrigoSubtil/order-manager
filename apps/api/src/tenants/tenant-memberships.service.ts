import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import {
  AuthenticatedUser,
  RequestAuthentication,
  TenantContext,
} from '../common/auth/authenticated-request';
import { MembershipRole, MembershipStatus, TenantStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IdentityInvitationService } from '../users/identity-invitation.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { TenantAccessService } from './tenant-access.service';

@Injectable()
export class TenantMembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly invitations: IdentityInvitationService,
    private readonly audit: AuditService,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.withIdentityContext(userId, async () => {
      const memberships = await this.prisma.client().tenantMembership.findMany({
        where: { userId },
        orderBy: [{ status: 'asc' }, { tenant: { name: 'asc' } }],
        select: {
          id: true,
          role: true,
          status: true,
          tenant: { select: { id: true, slug: true, name: true } },
        },
      });
      return memberships;
    });
  }

  async listForActiveTenant(context: RequestAuthentication) {
    return this.prisma.withTenantContext(context, async () => {
      const memberships = await this.prisma.client().tenantMembership.findMany({
        where: { tenantId: context.tenant.tenantId },
        orderBy: [{ role: 'asc' }, { user: { displayName: 'asc' } }],
        select: {
          id: true,
          role: true,
          status: true,
          tenant: { select: { id: true, slug: true, name: true } },
          user: { select: { id: true, displayName: true, email: true } },
        },
      });
      return memberships;
    });
  }

  async createTenant(user: AuthenticatedUser, input: CreateTenantDto) {
    return this.prisma.withIdentityContext(user.id, async () => {
      const hasDefault =
        (await this.prisma.client().tenantMembership.count({
          where: { userId: user.id, status: MembershipStatus.ACTIVE, isDefault: true },
        })) > 0;

      return this.prisma.withTransaction(async (transaction) => {
        const tenant = await transaction.tenant.create({
          data: {
            name: input.name.trim(),
            slug: input.slug,
            status: TenantStatus.ACTIVE,
            createdById: user.id,
            updatedById: user.id,
          },
        });
        const membership = await transaction.tenantMembership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
            isDefault: !hasDefault,
            createdById: user.id,
            updatedById: user.id,
          },
          select: { id: true, role: true, status: true },
        });
        await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;
        await transaction.tenantSettings.create({
          data: {
            tenantId: tenant.id,
            timezone: 'Europe/Lisbon',
            locale: 'pt-PT',
            createdById: user.id,
            updatedById: user.id,
          },
        });
        await this.audit.record(transaction, {
          tenantId: tenant.id,
          actorUserId: user.id,
          action: 'TENANT_CREATED',
          entityType: 'TENANT',
          entityId: tenant.id,
        });
        return { ...membership, tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name } };
      });
    });
  }

  async switchTenant(userId: string, membershipId: string): Promise<TenantContext> {
    return this.tenantAccess.resolveForUser(userId, membershipId);
  }

  async invite(context: RequestAuthentication, input: InviteMemberDto, requestId?: string) {
    if (input.role === MembershipRole.OWNER && context.tenant.role !== MembershipRole.OWNER) {
      throw new ForbiddenException({
        code: 'OWNER_ROLE_REQUIRED',
        message: 'Only an OWNER can invite another OWNER.',
      });
    }

    const invitedUser = await this.invitations.invite(input.email.toLowerCase());
    return this.prisma.withTenantContext(context, () =>
      this.prisma.withTransaction(async (transaction) => {
        await transaction.$executeRaw`SELECT public.upsert_invited_user_profile(
        ${invitedUser.id}::uuid,
        ${invitedUser.email ?? input.email},
        ${invitedUser.displayName}
      )`;

        const existing = await transaction.tenantMembership.findFirst({
          where: { tenantId: context.tenant.tenantId, userId: invitedUser.id },
        });
        if (existing && existing.status !== MembershipStatus.REVOKED) {
          throw new ConflictException({
            code: 'MEMBERSHIP_ALREADY_EXISTS',
            message: 'This user already has a membership in the active company.',
          });
        }

        const membership = existing
          ? await transaction.tenantMembership.update({
              where: { id: existing.id },
              data: {
                role: input.role,
                status: MembershipStatus.INVITED,
                isDefault: false,
                revokedAt: null,
                revokedById: null,
                updatedById: context.user.id,
              },
              include: { tenant: { select: { id: true, slug: true, name: true } } },
            })
          : await transaction.tenantMembership.create({
              data: {
                tenantId: context.tenant.tenantId,
                userId: invitedUser.id,
                role: input.role,
                status: MembershipStatus.INVITED,
                createdById: context.user.id,
                updatedById: context.user.id,
              },
              include: { tenant: { select: { id: true, slug: true, name: true } } },
            });
        await this.audit.record(transaction, {
          tenantId: context.tenant.tenantId,
          actorUserId: context.user.id,
          action: 'MEMBERSHIP_INVITED',
          entityType: 'MEMBERSHIP',
          entityId: membership.id,
          requestId,
          metadata: { role: input.role },
        });
        return this.membershipResponse(membership);
      }),
    );
  }

  async acceptInvitation(userId: string, membershipId: string) {
    return this.prisma.withIdentityContext(userId, async () => {
      const membership = await this.prisma.client().tenantMembership.findFirst({
        where: { id: membershipId, userId, status: MembershipStatus.INVITED },
        include: { tenant: { select: { id: true, slug: true, name: true, status: true } } },
      });
      if (!membership || membership.tenant.status !== TenantStatus.ACTIVE) {
        throw new NotFoundException({
          code: 'INVITATION_NOT_FOUND',
          message: 'No pending active invitation was found.',
        });
      }

      const hasDefault =
        (await this.prisma.client().tenantMembership.count({
          where: { userId, status: MembershipStatus.ACTIVE, isDefault: true },
        })) > 0;
      await this.prisma.client().tenantMembership.updateMany({
        where: { id: membershipId, userId, status: MembershipStatus.INVITED },
        data: {
          status: MembershipStatus.ACTIVE,
          isDefault: !hasDefault,
          updatedById: userId,
        },
      });
      return this.membershipResponse({ ...membership, status: MembershipStatus.ACTIVE });
    });
  }

  async manage(
    context: RequestAuthentication,
    membershipId: string,
    input: UpdateMembershipDto,
    requestId?: string,
  ) {
    if (!input.role && !input.status) {
      throw new BadRequestException({
        code: 'MEMBERSHIP_CHANGE_REQUIRED',
        message: 'Provide a role or membership status to change.',
      });
    }

    return this.prisma.withTransaction(async (transaction) => {
      const membership = await transaction.tenantMembership.findFirst({
        where: { id: membershipId, tenantId: context.tenant.tenantId },
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      });
      if (!membership) {
        throw new NotFoundException({
          code: 'MEMBERSHIP_NOT_FOUND',
          message: 'Membership not found.',
        });
      }
      if (
        context.tenant.role === MembershipRole.ADMIN &&
        (membership.role === MembershipRole.OWNER || input.role === MembershipRole.OWNER)
      ) {
        throw new ForbiddenException({
          code: 'OWNER_ROLE_REQUIRED',
          message: 'An ADMIN cannot manage OWNER memberships.',
        });
      }

      const nextRole = input.role ?? membership.role;
      const nextStatus = input.status ?? membership.status;
      if (
        membership.role === MembershipRole.OWNER &&
        membership.status === MembershipStatus.ACTIVE &&
        (nextRole !== MembershipRole.OWNER || nextStatus !== MembershipStatus.ACTIVE)
      ) {
        const ownerCount = await transaction.tenantMembership.count({
          where: {
            tenantId: context.tenant.tenantId,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
          },
        });
        if (ownerCount <= 1) {
          throw new ConflictException({
            code: 'LAST_OWNER_REQUIRED',
            message: 'The last active OWNER cannot be suspended, revoked or demoted.',
          });
        }
      }

      const revoked = nextStatus === MembershipStatus.REVOKED;
      const result = await transaction.tenantMembership.updateMany({
        where: { id: membershipId, tenantId: context.tenant.tenantId },
        data: {
          role: nextRole,
          status: nextStatus,
          isDefault: nextStatus === MembershipStatus.ACTIVE ? membership.isDefault : false,
          revokedAt: revoked ? new Date() : null,
          revokedById: revoked ? context.user.id : null,
          updatedById: context.user.id,
        },
      });
      if (result.count !== 1) {
        throw new NotFoundException({
          code: 'MEMBERSHIP_NOT_FOUND',
          message: 'Membership not found.',
        });
      }
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: `MEMBERSHIP_${nextStatus}`,
        entityType: 'MEMBERSHIP',
        entityId: membership.id,
        requestId,
        metadata: {
          role: nextRole,
          previousRole: membership.role,
          previousStatus: membership.status,
        },
      });
      return this.membershipResponse({ ...membership, role: nextRole, status: nextStatus });
    });
  }

  private membershipResponse(membership: {
    id: string;
    role: MembershipRole;
    status: MembershipStatus;
    tenant: { id: string; slug: string; name: string };
  }) {
    return {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      tenant: membership.tenant,
    };
  }
}
