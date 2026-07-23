import { BadRequestException, Injectable } from '@nestjs/common';

import { RequestAuthentication } from '../common/auth/authenticated-request';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { ReportsRepository } from './reports.repository';
import { buildProductionSummary } from './reports.utils';

@Injectable()
export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

  async detailed(context: RequestAuthentication, query: ReportPeriodQueryDto) {
    this.validatePeriod(query);
    const orders = await this.repository.findOrders(context.tenant.tenantId, query);
    return {
      ...this.envelope(context, query),
      format: 'DETAILED' as const,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber.toString(),
        clientName: order.clientName,
        phone: order.phone,
        deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
        deliveryTime: order.deliveryTime?.toISOString().slice(11, 16) ?? null,
        responsible: order.responsible,
        items: order.items.map((item) => ({
          id: item.id,
          category: item.category,
          productName: item.productName,
          quantityValue: item.quantityValue.toString(),
          quantityUnit: item.quantityUnit,
          notes: item.notes,
          position: item.position,
        })),
      })),
    };
  }

  async productionSummary(context: RequestAuthentication, query: ReportPeriodQueryDto) {
    this.validatePeriod(query);
    const orders = await this.repository.findOrders(context.tenant.tenantId, query);
    return {
      ...this.envelope(context, query),
      format: 'PRODUCTION_SUMMARY' as const,
      orderCount: orders.length,
      groups: buildProductionSummary(
        orders.flatMap((order) =>
          order.items.map((item) => ({
            category: item.category,
            productName: item.productName,
            quantityValue: item.quantityValue.toString(),
            quantityUnit: item.quantityUnit,
          })),
        ),
      ),
    };
  }

  private envelope(context: RequestAuthentication, query: ReportPeriodQueryDto) {
    return {
      generatedAt: new Date().toISOString(),
      from: query.from,
      until: query.until,
      tenant: { id: context.tenant.tenantId, slug: context.tenant.tenantSlug },
    };
  }

  private validatePeriod(query: ReportPeriodQueryDto): void {
    if (query.from > query.until)
      throw new BadRequestException({
        code: 'INVALID_REPORT_PERIOD',
        message: 'from must be before or equal to until.',
      });
  }
}
