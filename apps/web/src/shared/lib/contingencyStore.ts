import type { CatalogProduct, Order, OrderResponsible } from './domain';
import type { OrderListParams, SessionContext } from './supabaseData';

export type ContingencySnapshot = {
  catalogProducts: CatalogProduct[];
  orders: Order[];
  responsibles: OrderResponsible[];
  savedAt: string;
  tenantId: string;
  version: 1;
};

const cachePrefix = 'order-manager:contingency:';
const contextPrefix = 'order-manager:session-context:';

function storageKey(tenantId: string) {
  return `${cachePrefix}${tenantId}`;
}

function isSnapshot(value: unknown): value is ContingencySnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<ContingencySnapshot>;
  return (
    snapshot.version === 1 &&
    typeof snapshot.tenantId === 'string' &&
    typeof snapshot.savedAt === 'string' &&
    Array.isArray(snapshot.orders) &&
    Array.isArray(snapshot.catalogProducts) &&
    Array.isArray(snapshot.responsibles)
  );
}

export function readContingencySnapshot(tenantId: string) {
  if (!tenantId || typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(storageKey(tenantId));
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isSnapshot(parsed) && parsed.tenantId === tenantId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveContingencySnapshot(snapshot: ContingencySnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(snapshot.tenantId), JSON.stringify(snapshot));
}

function isSessionContext(value: unknown): value is SessionContext {
  if (!value || typeof value !== 'object') return false;
  const context = value as Partial<SessionContext>;
  return Boolean(
    context.user?.id &&
    context.user.username &&
    context.tenant?.id &&
    context.tenant.name &&
    context.tenant.slug &&
    (context.role === 'OWNER' || context.role === 'OPERATOR'),
  );
}

export function readCachedSessionContext(userId: string) {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(`${contextPrefix}${userId}`);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isSessionContext(parsed) && parsed.user.id === userId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedSessionContext(context: SessionContext) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${contextPrefix}${context.user.id}`, JSON.stringify(context));
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase('pt-PT');
}

function matchesSearch(order: Order, search: string) {
  const terms = normalized(search).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const searchable = normalized(
    [
      order.clientName,
      order.phone,
      order.responsibleName,
      ...order.products.flatMap((product) => [
        product.category,
        product.product,
        product.notes,
        product.quantity,
      ]),
    ].join(' '),
  );
  return terms.every((term) => searchable.includes(term));
}

export function compareOrdersByDelivery(first: Order, second: Order) {
  const dateTimeComparison = `${first.deliveryDate} ${first.deliveryTime}`.localeCompare(
    `${second.deliveryDate} ${second.deliveryTime}`,
  );
  if (dateTimeComparison !== 0) return dateTimeComparison;
  return (
    (first.orderNumber ?? Number.MAX_SAFE_INTEGER) - (second.orderNumber ?? Number.MAX_SAFE_INTEGER)
  );
}

export function sortOrdersByDelivery(orders: Order[]) {
  return [...orders].sort(compareOrdersByDelivery);
}

export function filterContingencyOrders(
  orders: Order[],
  params: Pick<OrderListParams, 'category' | 'from' | 'search' | 'until'>,
) {
  return sortOrdersByDelivery(
    orders.filter(
      (order) =>
        (!params.from || order.deliveryDate >= params.from) &&
        (!params.until || order.deliveryDate <= params.until) &&
        (!params.category ||
          order.products.some((product) => product.category === params.category)) &&
        (!params.search || matchesSearch(order, params.search)),
    ),
  );
}
