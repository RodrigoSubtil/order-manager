import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { RequestAuthentication } from '../common/auth/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogRepository } from './catalog.repository';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { ListCatalogProductsDto } from './dto/list-catalog-products.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CatalogRepository,
    private readonly audit: AuditService,
  ) {}

  async list(context: RequestAuthentication, query: ListCatalogProductsDto) {
    const [items, total] = await Promise.all([
      this.repository.findMany(context.tenant.tenantId, query),
      this.repository.count(context.tenant.tenantId, query),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async get(context: RequestAuthentication, id: string) {
    return this.requireProduct(context.tenant.tenantId, id);
  }

  async create(context: RequestAuthentication, input: CreateCatalogProductDto, requestId?: string) {
    return this.prisma.withTransaction(async (transaction) => {
      const product = await this.repository.create(
        transaction,
        context.tenant.tenantId,
        context.user.id,
        input,
      );
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'CATALOG_PRODUCT_CREATED',
        entityType: 'CATALOG_PRODUCT',
        entityId: product.id,
        requestId,
        metadata: { category: product.category, isActive: product.isActive },
      });
      return product;
    });
  }

  async update(
    context: RequestAuthentication,
    id: string,
    input: UpdateCatalogProductDto,
    requestId?: string,
  ) {
    await this.requireProduct(context.tenant.tenantId, id);
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
          message: 'Catalog product was changed.',
        });
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'CATALOG_PRODUCT_UPDATED',
        entityType: 'CATALOG_PRODUCT',
        entityId: id,
        requestId,
        metadata: { version: input.version },
      });
    });
    return this.requireProduct(context.tenant.tenantId, id);
  }

  async remove(
    context: RequestAuthentication,
    id: string,
    version: number,
    requestId?: string,
  ): Promise<void> {
    await this.requireProduct(context.tenant.tenantId, id);
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
          message: 'Catalog product was changed.',
        });
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'CATALOG_PRODUCT_DELETED',
        entityType: 'CATALOG_PRODUCT',
        entityId: id,
        requestId,
        metadata: { version },
      });
    });
  }

  private async requireProduct(tenantId: string, id: string) {
    const product = await this.repository.findById(tenantId, id);
    if (!product)
      throw new NotFoundException({
        code: 'CATALOG_PRODUCT_NOT_FOUND',
        message: 'Catalog product not found.',
      });
    return product;
  }
}
