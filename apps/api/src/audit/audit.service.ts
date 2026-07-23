import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';

export type AuditEntry = {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: 'CATALOG_PRODUCT' | 'RESPONSIBLE' | 'ORDER' | 'TENANT' | 'MEMBERSHIP';
  entityId: string;
  requestId?: string;
  metadata?: Record<string, boolean | number | string | null>;
};

@Injectable()
export class AuditService {
  async record(transaction: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    const requestId =
      entry.requestId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        entry.requestId,
      )
        ? entry.requestId
        : undefined;
    await transaction.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        requestId,
        metadata: entry.metadata ?? {},
      },
    });
  }
}
