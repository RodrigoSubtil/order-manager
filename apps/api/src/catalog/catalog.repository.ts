import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { ListCatalogProductsDto } from './dto/list-catalog-products.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, query: ListCatalogProductsDto) {
    const where: Prisma.CatalogProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.active === undefined ? {} : { isActive: query.active }),
      ...(query.search ? { name: { contains: query.search.trim(), mode: 'insensitive' } } : {}),
    };
    return this.prisma.client().catalogProduct.findMany({
      where,
      orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  count(tenantId: string, query: ListCatalogProductsDto) {
    return this.prisma.client().catalogProduct.count({
      where: {
        tenantId,
        deletedAt: null,
        ...(query.category ? { category: query.category } : {}),
        ...(query.active === undefined ? {} : { isActive: query.active }),
        ...(query.search ? { name: { contains: query.search.trim(), mode: 'insensitive' } } : {}),
      },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma
      .client()
      .catalogProduct.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  create(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    actorId: string,
    input: CreateCatalogProductDto,
  ) {
    return transaction.catalogProduct.create({
      data: { tenantId, createdById: actorId, updatedById: actorId, ...input },
    });
  }

  update(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    actorId: string,
    input: UpdateCatalogProductDto,
  ) {
    const { version, ...data } = input;
    return transaction.catalogProduct.updateMany({
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
    return transaction.catalogProduct.updateMany({
      where: { id, tenantId, version, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
        updatedById: actorId,
        version: { increment: 1 },
      },
    });
  }
}
