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

export type Order = {
  id: string;
  clientName: string;
  phone: string;
  responsibleId: string;
  responsibleName: string;
  deliveryDate: string;
  deliveryTime: string;
  products: ProductLine[];
  createdAt: string;
};

export type OrderForm = Omit<Order, 'id' | 'createdAt'>;

export const categories: Category[] = ['Pastelaria', 'Padaria', 'Salgados'];
