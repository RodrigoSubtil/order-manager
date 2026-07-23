export type Category = 'Pastelaria' | 'Padaria' | 'Salgados';

export type ProductLine = {
  id: string;
  category: Category;
  product: string;
  quantity: string;
  notes: string;
};

export type OrderResponsible = {
  id: string;
  name: string;
};

export type CatalogProduct = {
  id: string;
  category: Category;
  name: string;
};

export type Order = {
  id: string;
  orderNumber: number | null;
  clientName: string;
  phone: string;
  responsibleId: string;
  responsibleName: string;
  deliveryDate: string;
  deliveryTime: string;
  products: ProductLine[];
  createdAt: string;
  /** Present for orders loaded from the API; used for optimistic concurrency. */
  version?: number;
};

export type OrderForm = Omit<Order, 'id' | 'createdAt'>;

export const categories: Category[] = ['Pastelaria', 'Padaria', 'Salgados'];

export function toCategory(value: string): Category {
  return categories.includes(value as Category) ? (value as Category) : 'Pastelaria';
}
