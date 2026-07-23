import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResponsibleDto } from './dto/create-responsible.dto';
import { ListResponsiblesDto } from './dto/list-responsibles.dto';
import { UpdateResponsibleDto } from './dto/update-responsible.dto';

@Injectable()
export class ResponsiblesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, query: ListResponsiblesDto) {
    return this.prisma.client().responsible.findMany({
      where: this.where(tenantId, query),
      orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  count(tenantId: string, query: ListResponsiblesDto) {
    return this.prisma.client().responsible.count({ where: this.where(tenantId, query) });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.client().responsible.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  create(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    actorId: string,
    input: CreateResponsibleDto,
  ) {
    return transaction.responsible.create({
      data: { tenantId, createdById: actorId, updatedById: actorId, ...input },
    });
  }

  update(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    actorId: string,
    input: UpdateResponsibleDto,
  ) {
    const { version, ...data } = input;
    return transaction.responsible.updateMany({
      where: { id, tenantId, version, deletedAt: null },
      data: { ...data, updatedById: actorId, version: { increment: 1 } },
    });
  }

  softDelete(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    actorId: string,
    version: number,
  ) {
    return transaction.responsible.updateMany({
      where: { id, tenantId, version, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
        updatedById: actorId,
        version: { increment: 1 },
      },
    });
  }

  private where(tenantId: string, query: ListResponsiblesDto): Prisma.ResponsibleWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(query.active === undefined ? {} : { isActive: query.active }),
      ...(query.search ? { name: { contains: query.search.trim(), mode: 'insensitive' } } : {}),
    };
  }
}
