import { createHash } from 'node:crypto';

import { MembershipRole, ProductCategory, QuantityUnit } from '../../src/generated/prisma/client';
import { parseLegacyQuantity } from './quantity';
import type {
  IdMapping,
  LegacyAnalysis,
  LegacyExport,
  MigrationIssue,
  PreparedCatalogProduct,
  PreparedOrder,
  PreparedOrderItem,
  PreparedResponsible,
} from './types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requiredColumns: Record<string, string[]> = {
  app_users: ['id', 'username', 'bakery_name'],
  orders: [
    'id',
    'order_number',
    'app_user_id',
    'client_name',
    'phone',
    'responsible_id',
    'delivery_date',
    'delivery_time',
    'created_at',
  ],
  order_products: ['id', 'order_id', 'category', 'product', 'quantity', 'notes', 'position'],
  order_responsibles: ['id', 'app_user_id', 'name', 'is_active', 'position'],
  catalog_products: ['id', 'category', 'name', 'is_active', 'position'],
};

export function analyzeLegacyExport(source: LegacyExport): LegacyAnalysis {
  const issues: MigrationIssue[] = [];
  const idMappings: IdMapping[] = [];
  const metadataConfirmed = validateMetadata(source, issues);
  validateConfiguration(source, issues);
  validateSourceRecords(source, issues);

  const userMappings = new Map(
    source.migration.userMappings.map((mapping) => [mapping.appUserId, mapping]),
  );
  const responsibleRecords = new Map<string, PreparedResponsible>();
  const responsibles: PreparedResponsible[] = [];
  for (const item of source.data.orderResponsibles) {
    const userMapping = userMappings.get(item.appUserId);
    if (!userMapping) {
      issues.push(
        blocking('APP_USER_UNMAPPED', 'order_responsibles', item.id, 'app_user_id', item.appUserId),
      );
      continue;
    }
    const targetId = mapId('RESPONSIBLE', item.id, idMappings, issues);
    const prepared = { ...item, targetId, targetUserId: userMapping.userId };
    responsibleRecords.set(item.id, prepared);
    responsibles.push(prepared);
  }

  const catalogProducts: PreparedCatalogProduct[] = [];
  for (const product of source.data.catalogProducts) {
    const category = mapCategory(product.category);
    if (!category) {
      issues.push(
        blocking(
          'CATEGORY_UNSUPPORTED',
          'catalog_products',
          product.id,
          'category',
          product.category,
        ),
      );
      continue;
    }
    catalogProducts.push({
      ...product,
      targetId: mapId('CATALOG_PRODUCT', product.id, idMappings, issues),
      targetCategory: category,
    });
  }

  const orders: PreparedOrder[] = [];
  const orderIds = new Map<string, string>();
  for (const order of source.data.orders) {
    const userMapping = userMappings.get(order.appUserId);
    if (!userMapping) {
      issues.push(
        blocking('APP_USER_UNMAPPED', 'orders', order.id, 'app_user_id', order.appUserId),
      );
      continue;
    }
    const orderNumber = parseOrderNumber(order.orderNumber);
    if (!orderNumber) {
      issues.push(
        blocking('ORDER_NUMBER_INVALID', 'orders', order.id, 'order_number', order.orderNumber),
      );
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(order.deliveryDate)) {
      issues.push(
        blocking('DELIVERY_DATE_INVALID', 'orders', order.id, 'delivery_date', order.deliveryDate),
      );
      continue;
    }
    if (
      order.deliveryTime &&
      !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(order.deliveryTime)
    ) {
      issues.push(
        blocking('DELIVERY_TIME_INVALID', 'orders', order.id, 'delivery_time', order.deliveryTime),
      );
      continue;
    }
    const targetId = mapId('ORDER', order.id, idMappings, issues);
    orderIds.set(order.id, targetId);
    let targetResponsibleId: string | null = null;
    if (order.responsibleId) {
      const responsible = responsibleRecords.get(order.responsibleId);
      targetResponsibleId = responsible?.targetId ?? null;
      if (!responsible) {
        issues.push(
          blocking('RESPONSIBLE_ORPHAN', 'orders', order.id, 'responsible_id', order.responsibleId),
        );
      } else if (responsible.appUserId !== order.appUserId) {
        issues.push(
          blocking(
            'RESPONSIBLE_APP_USER_MISMATCH',
            'orders',
            order.id,
            'responsible_id',
            order.responsibleId,
          ),
        );
      }
    }
    orders.push({
      ...order,
      targetId,
      targetOrderNumber: orderNumber,
      targetResponsibleId,
      targetUserId: userMapping.userId,
    });
  }

  const orderItems: PreparedOrderItem[] = [];
  for (const item of source.data.orderProducts) {
    const targetOrderId = orderIds.get(item.orderId);
    if (!targetOrderId) {
      issues.push(
        blocking('ORDER_PRODUCT_ORPHAN', 'order_products', item.id, 'order_id', item.orderId),
      );
      continue;
    }
    const category = mapCategory(item.category);
    if (!category) {
      issues.push(
        blocking('CATEGORY_UNSUPPORTED', 'order_products', item.id, 'category', item.category),
      );
      continue;
    }
    const quantity = parseLegacyQuantity(item.quantity);
    if (!quantity.ok) {
      issues.push({
        ...blocking('QUANTITY_UNCONVERTIBLE', 'order_products', item.id, 'quantity', item.quantity),
        message: quantity.reason,
      });
      continue;
    }
    orderItems.push({
      ...item,
      targetId: mapId('ORDER_ITEM', item.id, idMappings, issues),
      targetOrderId,
      targetCategory: category,
      quantityValue: quantity.value,
      quantityUnit: quantity.unit,
    });
  }

  const sourceOrdersWithoutItems = source.data.orders
    .filter((order) => !source.data.orderProducts.some((item) => item.orderId === order.id))
    .map((order) => order.id);
  for (const orderId of sourceOrdersWithoutItems) {
    issues.push(blocking('ORDER_WITHOUT_ITEMS', 'orders', orderId));
  }

  detectDuplicateOrderNumbers(source, issues);
  const duplicateGroups = [
    ...detectNameDuplicates('order_responsibles', source.data.orderResponsibles),
    ...detectNameDuplicates('catalog_products', source.data.catalogProducts),
  ];
  for (const duplicate of duplicateGroups) {
    issues.push({
      severity: 'WARNING',
      code: 'DUPLICATE_NAME_DETECTED',
      entity: duplicate.entity,
      message: 'Duplicate names were preserved and require an explicit business decision.',
    });
  }

  return {
    source,
    issues,
    idMappings,
    responsibles,
    catalogProducts,
    orders,
    orderItems,
    duplicateGroups,
    metadataConfirmed,
    sourceCounts: {
      appUsers: source.data.appUsers.length,
      orders: source.data.orders.length,
      orderItems: source.data.orderProducts.length,
      responsibles: source.data.orderResponsibles.length,
      catalogProducts: source.data.catalogProducts.length,
    },
  };
}

function validateMetadata(source: LegacyExport, issues: MigrationIssue[]): boolean {
  let valid = true;
  if (!source.export.authorizationReference.trim()) {
    issues.push(blocking('EXPORT_NOT_AUTHORIZED', 'export'));
    valid = false;
  }
  if (!Number.isFinite(Date.parse(source.export.exportedAt))) {
    issues.push(blocking('EXPORT_TIMESTAMP_INVALID', 'export'));
    valid = false;
  }
  for (const [tableName, columns] of Object.entries(requiredColumns)) {
    const table = source.schema.tables.find((candidate) => candidate.name === tableName);
    if (!table) {
      issues.push(blocking('SCHEMA_TABLE_MISSING', 'schema', tableName));
      valid = false;
      continue;
    }
    for (const column of columns) {
      const definition = table.columns.find((candidate) => candidate.name === column);
      if (!definition?.dataType) {
        issues.push(blocking('SCHEMA_COLUMN_MISSING', tableName, column));
        valid = false;
      }
    }
    if (
      !Array.isArray(table.constraints) ||
      !Array.isArray(table.indexes) ||
      !Array.isArray(table.foreignKeys)
    ) {
      issues.push(blocking('SCHEMA_DETAILS_INCOMPLETE', tableName));
      valid = false;
    }
  }
  for (const rpc of ['login_app_user', 'list_order_responsibles']) {
    if (
      !source.schema.rpcs.some((candidate) => candidate.name === rpc && candidate.definitionHash)
    ) {
      issues.push(blocking('RPC_DEFINITION_MISSING', 'rpcs', rpc));
      valid = false;
    }
  }
  if (!Array.isArray(source.schema.triggers) || !Array.isArray(source.schema.policies)) {
    issues.push(blocking('SECURITY_METADATA_MISSING', 'schema'));
    valid = false;
  }
  return valid;
}

function validateConfiguration(source: LegacyExport, issues: MigrationIssue[]): void {
  const { tenant, userMappings } = source.migration;
  if (!uuidPattern.test(tenant.id))
    issues.push(blocking('TENANT_ID_INVALID', 'migration', tenant.id));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenant.slug)) {
    issues.push(blocking('TENANT_SLUG_INVALID', 'migration', tenant.slug));
  }
  const owners = userMappings.filter((mapping) => mapping.role === MembershipRole.OWNER);
  if (owners.length !== 1) issues.push(blocking('OWNER_MAPPING_INVALID', 'migration'));
  if (!Object.values(QuantityUnit).includes(source.migration.defaults?.catalogProductUnit)) {
    issues.push(blocking('CATALOG_DEFAULT_UNIT_INVALID', 'migration'));
  }

  const sourceUserIds = new Set(source.data.appUsers.map((user) => user.id));
  const bakeryNames = new Set(
    source.data.appUsers
      .map((user) => user.bakeryName?.trim().toLocaleLowerCase('pt-PT'))
      .filter((name): name is string => Boolean(name)),
  );
  if (bakeryNames.size > 1) {
    issues.push(
      blocking('MULTIPLE_BAKERIES_IN_SINGLE_TENANT', 'migration', tenant.id, 'bakery_name'),
    );
  }
  const mappedSourceIds = new Set<string>();
  const mappedTargetIds = new Set<string>();
  for (const mapping of userMappings) {
    if (!uuidPattern.test(mapping.userId)) {
      issues.push(
        blocking(
          'AUTH_USER_ID_INVALID',
          'user_mappings',
          mapping.appUserId,
          'user_id',
          mapping.userId,
        ),
      );
    }
    if (!Object.values(MembershipRole).includes(mapping.role)) {
      issues.push(
        blocking(
          'MEMBERSHIP_ROLE_INVALID',
          'user_mappings',
          mapping.appUserId,
          'role',
          mapping.role,
        ),
      );
    }
    if (!sourceUserIds.has(mapping.appUserId)) {
      issues.push(blocking('APP_USER_MAPPING_ORPHAN', 'user_mappings', mapping.appUserId));
    }
    if (mappedSourceIds.has(mapping.appUserId)) {
      issues.push(blocking('APP_USER_MAPPING_DUPLICATE', 'user_mappings', mapping.appUserId));
    }
    if (mappedTargetIds.has(mapping.userId)) {
      issues.push(
        blocking(
          'AUTH_USER_MAPPING_DUPLICATE',
          'user_mappings',
          mapping.appUserId,
          'user_id',
          mapping.userId,
        ),
      );
    }
    mappedSourceIds.add(mapping.appUserId);
    mappedTargetIds.add(mapping.userId);
  }
  for (const sourceUser of source.data.appUsers) {
    if (!sourceUser.bakeryName?.trim()) {
      issues.push(blocking('BAKERY_NAME_MISSING', 'app_users', sourceUser.id, 'bakery_name'));
    }
    if (!mappedSourceIds.has(sourceUser.id)) {
      issues.push(blocking('APP_USER_UNMAPPED', 'app_users', sourceUser.id));
    }
  }
}

function validateSourceRecords(source: LegacyExport, issues: MigrationIssue[]): void {
  detectDuplicateIds('app_users', source.data.appUsers, issues);
  detectDuplicateIds('orders', source.data.orders, issues);
  detectDuplicateIds('order_products', source.data.orderProducts, issues);
  detectDuplicateIds('order_responsibles', source.data.orderResponsibles, issues);
  detectDuplicateIds('catalog_products', source.data.catalogProducts, issues);

  for (const user of source.data.appUsers) {
    requireText('app_users', user.id, 'username', user.username, issues);
  }
  for (const order of source.data.orders) {
    requireText('orders', order.id, 'client_name', order.clientName, issues);
    if (!Number.isFinite(Date.parse(order.createdAt))) {
      issues.push(
        blocking('CREATED_AT_INVALID', 'orders', order.id, 'created_at', order.createdAt),
      );
    }
  }
  for (const item of source.data.orderProducts) {
    requireText('order_products', item.id, 'product', item.product, issues);
    validatePosition('order_products', item.id, item.position, issues);
  }
  for (const responsible of source.data.orderResponsibles) {
    requireText('order_responsibles', responsible.id, 'name', responsible.name, issues);
    validatePosition('order_responsibles', responsible.id, responsible.position, issues);
  }
  for (const product of source.data.catalogProducts) {
    requireText('catalog_products', product.id, 'name', product.name, issues);
    validatePosition('catalog_products', product.id, product.position, issues);
  }
}

function detectDuplicateIds(
  entity: string,
  records: Array<{ id: string }>,
  issues: MigrationIssue[],
): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (!record.id.trim()) {
      issues.push(blocking('SOURCE_ID_EMPTY', entity));
    } else if (seen.has(record.id)) {
      issues.push(blocking('SOURCE_ID_DUPLICATE', entity, record.id));
    }
    seen.add(record.id);
  }
}

function requireText(
  entity: string,
  sourceId: string,
  field: string,
  value: string,
  issues: MigrationIssue[],
): void {
  if (!value.trim()) {
    issues.push(blocking('REQUIRED_TEXT_EMPTY', entity, sourceId, field, value));
  }
}

function validatePosition(
  entity: string,
  sourceId: string,
  value: number | null,
  issues: MigrationIssue[],
): void {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    issues.push(blocking('POSITION_INVALID', entity, sourceId, 'position', value));
  }
}

function mapId(
  entity: string,
  sourceId: string,
  mappings: IdMapping[],
  issues: MigrationIssue[],
): string {
  const preserved = uuidPattern.test(sourceId);
  const targetId = preserved ? sourceId : deterministicUuid(`${entity}:${sourceId}`);
  mappings.push({ entity, sourceId, targetId, preserved });
  if (!preserved) {
    issues.push({
      severity: 'WARNING',
      code: 'ID_REKEYED',
      entity,
      sourceId,
      message: 'The non-UUID legacy id was mapped deterministically and recorded.',
    });
  }
  return targetId;
}

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(
    createHash('sha256').update(`order-manager-legacy:${value}`).digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mapCategory(value: string): ProductCategory | null {
  const normalized = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalized === 'pastelaria') return ProductCategory.PASTELARIA;
  if (normalized === 'padaria') return ProductCategory.PADARIA;
  if (normalized === 'salgados') return ProductCategory.SALGADOS;
  return null;
}

function parseOrderNumber(value: number | string | null): bigint | null {
  if (value === null || !/^\d+$/.test(String(value))) return null;
  const parsed = BigInt(value);
  return parsed > 0 ? parsed : null;
}

function detectDuplicateOrderNumbers(source: LegacyExport, issues: MigrationIssue[]): void {
  const seen = new Map<string, string>();
  for (const order of source.data.orders) {
    if (order.orderNumber === null) continue;
    const key = String(order.orderNumber);
    const previous = seen.get(key);
    if (previous) {
      issues.push({
        ...blocking('ORDER_NUMBER_DUPLICATE', 'orders', order.id, 'order_number', key),
        message: `Order number duplicates source order ${previous}.`,
      });
    } else {
      seen.set(key, order.id);
    }
  }
}

function detectNameDuplicates(
  entity: string,
  records: Array<{ id: string; name: string }>,
): Array<{ entity: string; sourceIds: string[] }> {
  const groups = new Map<string, string[]>();
  for (const record of records) {
    const key = record.name.trim().toLocaleLowerCase('pt-PT');
    groups.set(key, [...(groups.get(key) ?? []), record.id]);
  }
  return [...groups.values()]
    .filter((ids) => ids.length > 1)
    .map((sourceIds) => ({ entity, sourceIds }));
}

function blocking(
  code: string,
  entity: string,
  sourceId?: string,
  field?: string,
  rawValue?: string | number | null,
): MigrationIssue {
  return {
    severity: 'BLOCKING',
    code,
    entity,
    sourceId,
    field,
    rawValue,
    message: 'Migration is blocked until this discrepancy has an approved resolution.',
  };
}
