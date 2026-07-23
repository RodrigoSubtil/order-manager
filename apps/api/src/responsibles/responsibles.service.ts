import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { RequestAuthentication } from '../common/auth/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResponsibleDto } from './dto/create-responsible.dto';
import { ListResponsiblesDto } from './dto/list-responsibles.dto';
import { UpdateResponsibleDto } from './dto/update-responsible.dto';
import { ResponsiblesRepository } from './responsibles.repository';

@Injectable()
export class ResponsiblesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ResponsiblesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(context: RequestAuthentication, query: ListResponsiblesDto) {
    const [items, total] = await Promise.all([
      this.repository.findMany(context.tenant.tenantId, query),
      this.repository.count(context.tenant.tenantId, query),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async get(context: RequestAuthentication, id: string) {
    return this.requireResponsible(context.tenant.tenantId, id);
  }

  async create(context: RequestAuthentication, input: CreateResponsibleDto, requestId?: string) {
    return this.prisma.withTransaction(async (transaction) => {
      const responsible = await this.repository.create(
        transaction,
        context.tenant.tenantId,
        context.user.id,
        input,
      );
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'RESPONSIBLE_CREATED',
        entityType: 'RESPONSIBLE',
        entityId: responsible.id,
        requestId,
        metadata: { isActive: responsible.isActive },
      });
      return responsible;
    });
  }

  async update(
    context: RequestAuthentication,
    id: string,
    input: UpdateResponsibleDto,
    requestId?: string,
  ) {
    await this.requireResponsible(context.tenant.tenantId, id);
    await this.prisma.withTransaction(async (transaction) => {
      const result = await this.repository.update(
        transaction,
        context.tenant.tenantId,
        id,
        context.user.id,
        input,
      );
      if (result.count !== 1)
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'Responsible was changed.',
        });
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'RESPONSIBLE_UPDATED',
        entityType: 'RESPONSIBLE',
        entityId: id,
        requestId,
        metadata: { version: input.version },
      });
    });
    return this.requireResponsible(context.tenant.tenantId, id);
  }

  async remove(
    context: RequestAuthentication,
    id: string,
    version: number,
    requestId?: string,
  ): Promise<void> {
    await this.requireResponsible(context.tenant.tenantId, id);
    await this.prisma.withTransaction(async (transaction) => {
      const result = await this.repository.softDelete(
        transaction,
        context.tenant.tenantId,
        id,
        context.user.id,
        version,
      );
      if (result.count !== 1)
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'Responsible was changed.',
        });
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'RESPONSIBLE_DELETED',
        entityType: 'RESPONSIBLE',
        entityId: id,
        requestId,
        metadata: { version },
      });
    });
  }

  private async requireResponsible(tenantId: string, id: string) {
    const responsible = await this.repository.findById(tenantId, id);
    if (!responsible)
      throw new NotFoundException({
        code: 'RESPONSIBLE_NOT_FOUND',
        message: 'Responsible not found.',
      });
    return responsible;
  }
}
