import type {
  CatalogProduct,
  Category,
  Order,
  OrderForm,
  OrderResponsible,
  ProductLine,
} from './domain';
import { supabase } from './supabase';

export type MembershipRole = 'OWNER' | 'OPERATOR';
export type QuantityUnit = 'UN' | 'KG' | 'G';

export type SessionContext = {
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  role: MembershipRole;
};

export type CatalogProductRecord = CatalogProduct & {
  defaultUnit: QuantityUnit;
  version: number;
};

export type ResponsibleRecord = OrderResponsible & {
  version: number;
};

export type ManagementAccessStatus = {
  configured: boolean;
  unlocked: boolean;
  unlockedUntil: string | null;
};

export type OrderListParams = {
  category?: Category;
  from?: string;
  page: number;
  pageSize: number;
  search?: string;
  until?: string;
};

export type PaginatedOrders = {
  items: Order[];
  page: number;
  pageSize: number;
  total: number;
};

type RawOrderItem = {
  id: string;
  category: string;
  productName: string;
  quantityValue: number | string;
  quantityUnit: string;
  notes: string | null;
  position: number;
};

type RawOrder = {
  id: string;
  orderNumber: number | string;
  clientName: string;
  phone: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  deliveryDate: string;
  deliveryTime: string | null;
  version: number;
  createdAt: string;
  items: RawOrderItem[];
};

type RawCatalogProduct = {
  id: string;
  category: string;
  name: string;
  defaultUnit: string;
  version: number;
};

type RawResponsible = {
  id: string;
  name: string;
  version: number;
};

type SupabaseError = {
  code?: string;
  message?: string;
};

export class SupabaseRpcError extends Error {
  code?: string;
  status?: number;

  constructor(error: SupabaseError) {
    super(error.message || 'Não foi possível comunicar com o Supabase.');
    this.name = 'SupabaseRpcError';
    this.code = error.code;
    this.status =
      error.code === '40001'
        ? 409
        : error.code === '42501'
          ? 403
          : error.code === 'PGRST116'
            ? 404
            : undefined;
  }
}

function asCategory(value: string): Category {
  switch (value) {
    case 'PASTELARIA':
    case 'Pastelaria':
      return 'Pastelaria';
    case 'PADARIA':
    case 'Padaria':
      return 'Padaria';
    case 'SALGADOS':
    case 'Salgados':
      return 'Salgados';
    default:
      return 'Pastelaria';
  }
}

function asQuantityUnit(value: string): QuantityUnit {
  const normalized = value.toUpperCase();
  return normalized === 'KG' || normalized === 'G' ? normalized : 'UN';
}

function quantityText(value: number | string, unit: string) {
  return `${String(value)} ${asQuantityUnit(unit).toLowerCase()}`;
}

function productLineFromRaw(item: RawOrderItem): ProductLine {
  return {
    id: item.id,
    category: asCategory(item.category),
    product: item.productName,
    quantity: quantityText(item.quantityValue, item.quantityUnit),
    notes: item.notes ?? '',
  };
}

function orderFromRaw(order: RawOrder): Order {
  return {
    id: order.id,
    orderNumber: Number(order.orderNumber),
    clientName: order.clientName,
    phone: order.phone ?? '',
    responsibleId: order.responsibleId ?? '',
    responsibleName: order.responsibleName ?? '',
    deliveryDate: order.deliveryDate,
    deliveryTime: order.deliveryTime?.slice(0, 5) ?? '',
    products: order.items.map(productLineFromRaw),
    createdAt: order.createdAt,
    version: order.version,
  };
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new SupabaseRpcError(error);
  return data as T;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  return rpc<SessionContext | null>('web_session_context');
}

export async function getManagementAccessStatus(): Promise<ManagementAccessStatus> {
  return rpc<ManagementAccessStatus>('web_management_status');
}

export async function initializeManagementPassword(password: string) {
  const response = await rpc<ManagementAccessStatus & { error?: string }>(
    'web_initialize_management_password',
    {
      p_password: password,
    },
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function unlockManagementAccess(password: string) {
  const response = await rpc<ManagementAccessStatus & { error?: string }>('web_unlock_management', {
    p_password: password,
  });
  if (response.error) throw new Error(response.error);
  return response;
}

export async function lockManagementAccess() {
  return rpc<void>('web_lock_management');
}

export async function listOrders(params: OrderListParams): Promise<PaginatedOrders> {
  const response = await rpc<{
    items: RawOrder[];
    page: number;
    pageSize: number;
    total: number;
  }>('web_list_orders', {
    p_category: params.category?.toUpperCase() ?? null,
    p_from: params.from || null,
    p_page: params.page,
    p_page_size: params.pageSize,
    p_search: params.search || null,
    p_until: params.until || null,
  });

  return {
    items: response.items.map(orderFromRaw),
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
  };
}

/** Fetches every matching order in safe database-sized pages for printing. */
export async function listAllOrders(
  params: Omit<OrderListParams, 'page' | 'pageSize'>,
): Promise<Order[]> {
  const firstPage = await listOrders({ ...params, page: 1, pageSize: 100 });
  const pages = Math.ceil(firstPage.total / firstPage.pageSize);
  if (pages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      listOrders({ ...params, page: index + 2, pageSize: firstPage.pageSize }),
    ),
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

export async function listCatalogProducts(): Promise<CatalogProductRecord[]> {
  const items = await rpc<RawCatalogProduct[]>('web_list_catalog_products');
  return items.map((item) => ({
    id: item.id,
    category: asCategory(item.category),
    name: item.name,
    defaultUnit: asQuantityUnit(item.defaultUnit),
    version: item.version,
  }));
}

export async function listResponsibles(): Promise<ResponsibleRecord[]> {
  const items = await rpc<RawResponsible[]>('web_list_responsibles');
  return items.map((item) => ({ id: item.id, name: item.name, version: item.version }));
}

function itemPayload(product: ProductLine, position: number) {
  const [rawValue = '', rawUnit = 'un'] = product.quantity.trim().split(/\s+/, 2);
  return {
    category: product.category.toUpperCase(),
    productName: product.product,
    quantityValue: rawValue.replace(',', '.'),
    quantityUnit: asQuantityUnit(rawUnit),
    notes: product.notes || null,
    position,
  };
}

export async function saveOrder(order: OrderForm, current?: Pick<Order, 'id' | 'version'>) {
  return rpc<{ id: string; version: number }>('web_save_order', {
    p_order: {
      ...(current ? { id: current.id, version: current.version } : {}),
      clientName: order.clientName,
      phone: order.phone || null,
      responsibleId: order.responsibleId || null,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime || null,
      items: order.products.map(itemPayload),
    },
  });
}

export async function deleteOrder(id: string, version: number) {
  return rpc<void>('web_delete_order', { p_order_id: id, p_version: version });
}

export async function completeOrder(id: string, version: number) {
  return rpc<void>('web_complete_order', { p_order_id: id, p_version: version });
}

export async function saveCatalogProduct(input: {
  category: Category;
  defaultUnit: QuantityUnit;
  id?: string;
  name: string;
  version?: number;
}) {
  return rpc<CatalogProductRecord>('web_save_catalog_product', {
    p_product: {
      id: input.id ?? null,
      version: input.version ?? null,
      category: input.category.toUpperCase(),
      defaultUnit: input.defaultUnit,
      name: input.name,
    },
  });
}

export async function deleteCatalogProduct(id: string, version: number) {
  return rpc<void>('web_delete_catalog_product', { p_product_id: id, p_version: version });
}

export async function saveResponsible(input: { id?: string; name: string; version?: number }) {
  return rpc<ResponsibleRecord>('web_save_responsible', {
    p_responsible: {
      id: input.id ?? null,
      version: input.version ?? null,
      name: input.name,
    },
  });
}

export async function deleteResponsible(id: string, version: number) {
  return rpc<void>('web_delete_responsible', { p_responsible_id: id, p_version: version });
}
