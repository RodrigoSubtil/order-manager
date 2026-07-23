import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkDeleteOrdersDto } from './dto/bulk-delete-orders.dto';
import { ListOrdersQueryDto, OrderStatusFilter } from './dto/list-orders-query.dto';
import { OrderItemDto } from './dto/order-item.dto';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, query: ListOrdersQueryDto) {
    return this.prisma.client().order.findMany({
      where: this.listWhere(tenantId, query),
      include: this.include(),
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }, { createdAt: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  count(tenantId: string, query: ListOrdersQueryDto) {
    return this.prisma.client().order.count({ where: this.listWhere(tenantId, query) });
  }

  findById(tenantId: string, id: string) {
    return this.prisma
      .client()
      .order.findFirst({ where: { id, tenantId, deletedAt: null }, include: this.include() });
  }

  previewBulkDelete(tenantId: string, input: BulkDeleteOrdersDto) {
    const where = this.bulkWhere(tenantId, input);
    return this.prisma.client().order.findMany({
      where,
      select: { id: true, orderNumber: true, clientName: true, deliveryDate: true },
      orderBy: { deliveryDate: 'asc' },
      take: 100,
    });
  }

  countBulkDelete(tenantId: string, input: BulkDeleteOrdersDto) {
    return this.prisma.client().order.count({ where: this.bulkWhere(tenantId, input) });
  }

  async createItems(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    actorId: string,
    items: OrderItemDto[],
  ) {
    await transaction.orderItem.createMany({
      data: items.map((item, index) => ({
        tenantId,
        orderId,
        catalogProductId: item.catalogProductId,
        category: item.category,
        productName: item.productName.trim(),
        quantityValue: item.quantityValue,
        quantityUnit: item.quantityUnit,
        notes: item.notes?.trim() || null,
        position: item.position ?? index,
        createdById: actorId,
        updatedById: actorId,
      })),
    });
  }

  private listWhere(tenantId: string, query: ListOrdersQueryDto): Prisma.OrderWhereInput {
    const text = query.search?.trim();
    return {
      tenantId,
      deletedAt: query.status === OrderStatusFilter.DELETED ? { not: null } : null,
      ...(query.from || query.until
        ? {
            deliveryDate: {
              ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
              ...(query.until ? { lte: new Date(`${query.until}T00:00:00.000Z`) } : {}),
            },
          }
        : {}),
      ...(query.responsibleId ? { responsibleId: query.responsibleId } : {}),
      ...(query.category ? { items: { some: { category: query.category, deletedAt: null } } } : {}),
      ...(text
        ? {
            OR: [
              { clientName: { contains: text, mode: 'insensitive' } },
              { phone: { contains: text, mode: 'insensitive' } },
              { responsible: { name: { contains: text, mode: 'insensitive' } } },
              {
                items: {
                  some: { productName: { contains: text, mode: 'insensitive' }, deletedAt: null },
                },
              },
            ],
          }
        : {}),
    };
  }

  private bulkWhere(tenantId: string, input: BulkDeleteOrdersDto): Prisma.OrderWhereInput {
    return {
      tenantId,
      deletedAt: null,
      deliveryDate: {
        ...(input.from ? { gte: new Date(`${input.from}T00:00:00.000Z`) } : {}),
        lte: new Date(`${input.until}T00:00:00.000Z`),
      },
    };
  }

  private include() {
    return {
      responsible: true,
      items: { where: { deletedAt: null }, orderBy: { position: 'asc' as const } },
    };
  }
}
