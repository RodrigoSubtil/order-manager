import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { RequestAuthentication } from '../common/auth/authenticated-request';
import { Prisma, QuantityUnit } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkDeleteOrdersDto } from './dto/bulk-delete-orders.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: OrdersRepository,
    private readonly audit: AuditService,
  ) {}

  async list(context: RequestAuthentication, query: ListOrdersQueryDto) {
    const [orders, total] = await Promise.all([
      this.repository.findMany(context.tenant.tenantId, query),
      this.repository.count(context.tenant.tenantId, query),
    ]);
    return {
      items: orders.map((order) => this.toResponse(order)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(context: RequestAuthentication, id: string) {
    return this.toResponse(await this.requireOrder(context.tenant.tenantId, id));
  }

  async create(context: RequestAuthentication, input: CreateOrderDto, requestId?: string) {
    const order = await this.prisma.reserveOrderNumber(
      context.tenant.tenantId,
      async (transaction, orderNumber) => {
        await this.validateReferences(
          transaction,
          context.tenant.tenantId,
          input.responsibleId,
          input.items,
        );
        const created = await transaction.order.create({
          data: {
            tenantId: context.tenant.tenantId,
            orderNumber,
            clientName: input.clientName.trim(),
            phone: input.phone?.trim() || null,
            responsibleId: input.responsibleId || null,
            deliveryDate: new Date(`${input.deliveryDate}T00:00:00.000Z`),
            deliveryTime: input.deliveryTime ? this.toTime(input.deliveryTime) : null,
            createdById: context.user.id,
            updatedById: context.user.id,
          },
        });
        await this.repository.createItems(
          transaction,
          context.tenant.tenantId,
          created.id,
          context.user.id,
          input.items,
        );
        await this.audit.record(transaction, {
          tenantId: context.tenant.tenantId,
          actorUserId: context.user.id,
          action: 'ORDER_CREATED',
          entityType: 'ORDER',
          entityId: created.id,
          requestId,
          metadata: { itemCount: input.items.length, orderNumber: Number(orderNumber) },
        });
        return transaction.order.findFirst({
          where: { id: created.id, tenantId: context.tenant.tenantId },
          include: {
            responsible: true,
            items: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
          },
        });
      },
    );
    if (!order)
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    return this.toResponse(order);
  }

  async update(
    context: RequestAuthentication,
    id: string,
    input: UpdateOrderDto,
    requestId?: string,
  ) {
    await this.requireOrder(context.tenant.tenantId, id);
    const order = await this.prisma.withTransaction(async (transaction) => {
      await this.validateReferences(
        transaction,
        context.tenant.tenantId,
        input.responsibleId,
        input.items,
      );
      const result = await transaction.order.updateMany({
        where: { id, tenantId: context.tenant.tenantId, version: input.version, deletedAt: null },
        data: {
          ...(input.clientName === undefined ? {} : { clientName: input.clientName.trim() }),
          ...(input.phone === undefined ? {} : { phone: input.phone?.trim() || null }),
          ...(input.responsibleId === undefined ? {} : { responsibleId: input.responsibleId }),
          ...(input.deliveryDate === undefined
            ? {}
            : { deliveryDate: new Date(`${input.deliveryDate}T00:00:00.000Z`) }),
          ...(input.deliveryTime === undefined
            ? {}
            : { deliveryTime: input.deliveryTime ? this.toTime(input.deliveryTime) : null }),
          updatedById: context.user.id,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Order was changed.' });
      if (input.items) {
        await transaction.orderItem.updateMany({
          where: { tenantId: context.tenant.tenantId, orderId: id, deletedAt: null },
          data: {
            deletedAt: new Date(),
            deletedById: context.user.id,
            updatedById: context.user.id,
          },
        });
        await this.repository.createItems(
          transaction,
          context.tenant.tenantId,
          id,
          context.user.id,
          input.items,
        );
      }
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'ORDER_UPDATED',
        entityType: 'ORDER',
        entityId: id,
        requestId,
        metadata: { version: input.version, itemsReplaced: Boolean(input.items) },
      });
      return transaction.order.findFirst({
        where: { id, tenantId: context.tenant.tenantId, deletedAt: null },
        include: {
          responsible: true,
          items: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        },
      });
    });
    if (!order)
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    return this.toResponse(order);
  }

  async remove(
    context: RequestAuthentication,
    id: string,
    version: number,
    requestId?: string,
  ): Promise<void> {
    await this.requireOrder(context.tenant.tenantId, id);
    await this.prisma.withTransaction(async (transaction) => {
      const result = await transaction.order.updateMany({
        where: { id, tenantId: context.tenant.tenantId, version, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedById: context.user.id,
          updatedById: context.user.id,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Order was changed.' });
      await this.audit.record(transaction, {
        tenantId: context.tenant.tenantId,
        actorUserId: context.user.id,
        action: 'ORDER_DELETED',
        entityType: 'ORDER',
        entityId: id,
        requestId,
        metadata: { version },
      });
    });
  }

  async previewBulkDelete(context: RequestAuthentication, input: BulkDeleteOrdersDto) {
    const [orders, total] = await Promise.all([
      this.repository.previewBulkDelete(context.tenant.tenantId, input),
      this.repository.countBulkDelete(context.tenant.tenantId, input),
    ]);
    return {
      total,
      preview: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber.toString(),
        clientName: order.clientName,
        deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
      })),
      truncated: total > orders.length,
    };
  }

  async confirmBulkDelete(
    context: RequestAuthentication,
    input: BulkDeleteOrdersDto,
    requestId?: string,
  ) {
    if (!input.confirmation)
      throw new BadRequestException({
        code: 'BULK_DELETE_CONFIRMATION_REQUIRED',
        message: 'Bulk deletion requires confirmation=true.',
      });
    return this.prisma.withTransaction(async (transaction) => {
      const selected = await transaction.order.findMany({
        where: {
          tenantId: context.tenant.tenantId,
          deletedAt: null,
          deliveryDate: {
            ...(input.from ? { gte: new Date(`${input.from}T00:00:00.000Z`) } : {}),
            lte: new Date(`${input.until}T00:00:00.000Z`),
          },
        },
        select: { id: true },
      });
      if (!selected.length) return { deleted: 0 };
      await transaction.order.updateMany({
        where: {
          tenantId: context.tenant.tenantId,
          id: { in: selected.map((order) => order.id) },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedById: context.user.id,
          updatedById: context.user.id,
          version: { increment: 1 },
        },
      });
      await Promise.all(
        selected.map((order) =>
          this.audit.record(transaction, {
            tenantId: context.tenant.tenantId,
            actorUserId: context.user.id,
            action: 'ORDER_BULK_DELETED',
            entityType: 'ORDER',
            entityId: order.id,
            requestId,
            metadata: {},
          }),
        ),
      );
      return { deleted: selected.length };
    });
  }

  private async requireOrder(tenantId: string, id: string) {
    const order = await this.repository.findById(tenantId, id);
    if (!order)
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    return order;
  }

  private async validateReferences(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    responsibleId?: string | null,
    items?: OrderItemDto[],
  ) {
    if (responsibleId) {
      const responsible = await transaction.responsible.findFirst({
        where: { id: responsibleId, tenantId, deletedAt: null, isActive: true },
      });
      if (!responsible)
        throw new BadRequestException({
          code: 'INVALID_RESPONSIBLE',
          message: 'Responsible is not available for this tenant.',
        });
    }
    for (const catalogProductId of [
      ...new Set((items ?? []).map((item) => item.catalogProductId).filter(Boolean)),
    ]) {
      const product = await transaction.catalogProduct.findFirst({
        where: { id: catalogProductId, tenantId, deletedAt: null, isActive: true },
      });
      if (!product)
        throw new BadRequestException({
          code: 'INVALID_CATALOG_PRODUCT',
          message: 'Catalog product is not available for this tenant.',
        });
    }
  }

  private toTime(value: string): Date {
    return new Date(`1970-01-01T${value}:00.000Z`);
  }

  private toResponse(order: {
    id: string;
    orderNumber: bigint;
    clientName: string;
    phone: string | null;
    responsibleId: string | null;
    deliveryDate: Date;
    deliveryTime: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    responsible: { id: string; name: string } | null;
    items: Array<{
      id: string;
      catalogProductId: string | null;
      category: string;
      productName: string;
      quantityValue: { toString(): string };
      quantityUnit: QuantityUnit;
      notes: string | null;
      position: number;
    }>;
  }) {
    return {
      id: order.id,
      orderNumber: order.orderNumber.toString(),
      clientName: order.clientName,
      phone: order.phone,
      responsibleId: order.responsibleId,
      responsibleName: order.responsible?.name ?? null,
      deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
      deliveryTime: order.deliveryTime?.toISOString().slice(11, 16) ?? null,
      version: order.version,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        catalogProductId: item.catalogProductId,
        category: item.category,
        productName: item.productName,
        quantityValue: item.quantityValue.toString(),
        quantityUnit: item.quantityUnit,
        notes: item.notes,
        position: item.position,
      })),
    };
  }
}
