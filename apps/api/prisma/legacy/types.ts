import type {
  MembershipRole,
  ProductCategory,
  QuantityUnit,
} from '../../src/generated/prisma/client';

export type LegacyColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
};

export type LegacyTableDefinition = {
  name: string;
  columns: LegacyColumn[];
  primaryKey: string[];
  foreignKeys: Array<{
    columns: string[];
    referencedTable: string;
    referencedColumns: string[];
  }>;
  indexes: string[];
  constraints: string[];
  rlsEnabled: boolean;
};

export type LegacyExport = {
  export: {
    authorizationReference: string;
    exportedAt: string;
    sourceEnvironment: string;
    sourceProjectReference: string;
    sanitized: boolean;
  };
  schema: {
    tables: LegacyTableDefinition[];
    rpcs: Array<{
      name: string;
      arguments: string[];
      securityMode: 'DEFINER' | 'INVOKER' | 'UNKNOWN';
      definitionHash: string;
    }>;
    triggers: Array<{ name: string; table: string; definition: string }>;
    policies: Array<{
      name: string;
      table: string;
      command: string;
      roles: string[];
      using: string | null;
      check: string | null;
    }>;
  };
  migration: {
    batchId: string;
    defaults: {
      catalogProductUnit: QuantityUnit;
    };
    tenant: {
      id: string;
      slug: string;
      name: string;
      timezone: string;
      locale: string;
    };
    userMappings: Array<{
      appUserId: string;
      userId: string;
      email: string;
      displayName: string;
      role: MembershipRole;
    }>;
  };
  data: {
    appUsers: Array<{
      id: string;
      username: string;
      bakeryName: string | null;
    }>;
    orders: Array<{
      id: string;
      orderNumber: number | string | null;
      appUserId: string;
      clientName: string;
      phone: string | null;
      responsibleId: string | null;
      deliveryDate: string;
      deliveryTime: string | null;
      createdAt: string;
    }>;
    orderProducts: Array<{
      id: string;
      orderId: string;
      category: string;
      product: string;
      quantity: string;
      notes: string | null;
      position: number | null;
    }>;
    orderResponsibles: Array<{
      id: string;
      appUserId: string;
      name: string;
      isActive: boolean;
      position: number | null;
    }>;
    catalogProducts: Array<{
      id: string;
      category: string;
      name: string;
      isActive: boolean;
      position: number | null;
    }>;
  };
};

export type MigrationIssueSeverity = 'BLOCKING' | 'WARNING';

export type MigrationIssue = {
  severity: MigrationIssueSeverity;
  code: string;
  entity: string;
  sourceId?: string;
  field?: string;
  rawValue?: string | number | null;
  message: string;
};

export type IdMapping = {
  entity: string;
  sourceId: string;
  targetId: string;
  preserved: boolean;
};

export type PreparedResponsible = LegacyExport['data']['orderResponsibles'][number] & {
  targetId: string;
  targetUserId: string;
};

export type PreparedCatalogProduct = LegacyExport['data']['catalogProducts'][number] & {
  targetId: string;
  targetCategory: ProductCategory;
};

export type PreparedOrder = LegacyExport['data']['orders'][number] & {
  targetId: string;
  targetOrderNumber: bigint;
  targetResponsibleId: string | null;
  targetUserId: string;
};

export type PreparedOrderItem = LegacyExport['data']['orderProducts'][number] & {
  targetId: string;
  targetOrderId: string;
  targetCategory: ProductCategory;
  quantityValue: string;
  quantityUnit: QuantityUnit;
};

export type LegacyAnalysis = {
  source: LegacyExport;
  issues: MigrationIssue[];
  idMappings: IdMapping[];
  responsibles: PreparedResponsible[];
  catalogProducts: PreparedCatalogProduct[];
  orders: PreparedOrder[];
  orderItems: PreparedOrderItem[];
  sourceCounts: Record<string, number>;
  duplicateGroups: Array<{ entity: string; sourceIds: string[] }>;
  metadataConfirmed: boolean;
};

export type ReconciliationReport = {
  batchId: string;
  sourceKind: 'FIXTURE' | 'AUTHORIZED_EXPORT';
  status: 'BLOCKED' | 'DRY_RUN_READY' | 'MIGRATED' | 'FAILED_RECONCILIATION';
  database: string | null;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
  idempotentReplay: boolean;
  metadataConfirmed: boolean;
  sourceCounts: Record<string, number>;
  destinationCounts: Record<string, number>;
  issues: MigrationIssue[];
  duplicateGroups: Array<{ entity: string; sourceIds: string[] }>;
  idMappings: IdMapping[];
  orphanCounts: {
    sourceOrderProducts: number;
    sourceResponsibles: number;
    destinationOrderItems: number;
  };
  ordersWithoutItems: {
    source: string[];
    destination: string[];
  };
  isolation: {
    expectedTenantId: string;
    foreignTenantRows: number;
  };
  nextOrderNumber: string | null;
  checks: {
    countsMatch: boolean;
    noSourceOrphans: boolean;
    noDestinationOrphans: boolean;
    everyOrderHasItems: boolean;
    tenantIsolation: boolean;
    nextOrderNumberValid: boolean;
  };
};
