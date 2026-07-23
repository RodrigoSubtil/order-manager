import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrders(tenantId: string, query: ReportPeriodQueryDto) {
    return this.prisma.client().order.findMany({
      where: this.where(tenantId, query),
      include: {
        responsible: { select: { id: true, name: true } },
        items: {
          where: { deletedAt: null, ...(query.category ? { category: query.category } : {}) },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }, { orderNumber: 'asc' }],
    });
  }

  private where(tenantId: string, query: ReportPeriodQueryDto): Prisma.OrderWhereInput {
    return {
      tenantId,
      deletedAt: null,
      deliveryDate: {
        gte: new Date(`${query.from}T00:00:00.000Z`),
        lte: new Date(`${query.until}T00:00:00.000Z`),
      },
      ...(query.responsibleId ? { responsibleId: query.responsibleId } : {}),
      ...(query.category ? { items: { some: { category: query.category, deletedAt: null } } } : {}),
    };
  }
}
