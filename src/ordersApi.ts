import { assertSupabaseConfigured, supabase } from './supabaseClient';
import { categories, type Category, type Order, type OrderForm, type ProductLine } from './types';

type OrderProductRow = {
  id: string;
  category: string;
  product: string;
  quantity: string;
  notes: string | null;
  position: number | null;
};

type OrderRow = {
  id: string;
  app_user_id: string;
  client_name: string;
  phone: string | null;
  delivery_date: string;
  delivery_time: string | null;
  created_at: string;
  order_products: OrderProductRow[];
};

function toCategory(value: string): Category {
  return categories.includes(value as Category) ? (value as Category) : 'Pastelaria';
}

function toProduct(row: OrderProductRow): ProductLine {
  return {
    id: row.id,
    category: toCategory(row.category),
    product: row.product,
    quantity: row.quantity,
    notes: row.notes ?? '',
  };
}

function toOrder(row: OrderRow): Order {
  const products = [...(row.order_products ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(toProduct);

  return {
    id: row.id,
    clientName: row.client_name,
    phone: row.phone ?? '',
    deliveryDate: row.delivery_date,
    deliveryTime: row.delivery_time?.slice(0, 5) ?? '',
    products,
    createdAt: row.created_at,
  };
}

function toOrderPayload(form: OrderForm) {
  return {
    client_name: form.clientName,
    phone: form.phone || null,
    delivery_date: form.deliveryDate,
    delivery_time: form.deliveryTime || null,
  };
}

function toProductPayload(orderId: string, product: ProductLine, position: number) {
  return {
    order_id: orderId,
    category: product.category,
    product: product.product,
    quantity: product.quantity,
    notes: product.notes || null,
    position,
  };
}

async function ensureOrderBelongsToUser(orderId: string, appUserId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('app_user_id', appUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Encomenda nao encontrada para este utilizador.');
  }
}

export async function fetchOrders(appUserId: string) {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
        id,
        app_user_id,
        client_name,
        phone,
        delivery_date,
        delivery_time,
        created_at,
        order_products (
          id,
          category,
          product,
          quantity,
          notes,
          position
        )
      `,
    )
    .eq('app_user_id', appUserId)
    .order('delivery_date', { ascending: true })
    .order('delivery_time', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrderRow[]).map(toOrder);
}

export async function createOrder(appUserId: string, form: OrderForm) {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...toOrderPayload(form),
      app_user_id: appUserId,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  await replaceProducts(data.id, form.products);
}

export async function updateOrder(appUserId: string, id: string, form: OrderForm) {
  assertSupabaseConfigured();

  await ensureOrderBelongsToUser(id, appUserId);

  const { error } = await supabase
    .from('orders')
    .update(toOrderPayload(form))
    .eq('id', id)
    .eq('app_user_id', appUserId);

  if (error) {
    throw error;
  }

  await replaceProducts(id, form.products);
}

export async function deleteOrderById(appUserId: string, id: string) {
  assertSupabaseConfigured();

  await ensureOrderBelongsToUser(id, appUserId);

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
    .eq('app_user_id', appUserId);

  if (error) {
    throw error;
  }
}

export async function deleteOrdersByDateRange(appUserId: string, from: string, until: string) {
  assertSupabaseConfigured();

  let query = supabase
    .from('orders')
    .delete()
    .eq('app_user_id', appUserId)
    .lte('delivery_date', until);

  if (from) {
    query = query.gte('delivery_date', from);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}

async function replaceProducts(orderId: string, products: ProductLine[]) {
  const { error: deleteError } = await supabase
    .from('order_products')
    .delete()
    .eq('order_id', orderId);

  if (deleteError) {
    throw deleteError;
  }

  const payload = products.map((product, index) => toProductPayload(orderId, product, index));

  if (!payload.length) {
    return;
  }

  const { error: insertError } = await supabase.from('order_products').insert(payload);

  if (insertError) {
    throw insertError;
  }
}