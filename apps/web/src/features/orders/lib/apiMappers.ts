import type {
  CatalogProductResponseDto,
  CreateOrderDto,
  DetailedReportOrderDto,
  OrderResponseDto,
  ProductCategory,
  ProductionSummaryResponseDto,
  QuantityUnit,
  ResponsibleResponseDto,
  UpdateOrderDto,
} from '@order-manager/api-client';

import {
  type CatalogProduct,
  type Category,
  type Order,
  type OrderForm,
  type OrderResponsible,
  type ProductLine,
} from '../../../shared/lib/domain';

const categoryByApiValue: Record<ProductCategory, Category> = {
  PASTELARIA: 'Pastelaria',
  PADARIA: 'Padaria',
  SALGADOS: 'Salgados',
};

const apiCategoryByCategory: Record<Category, ProductCategory> = {
  Pastelaria: 'PASTELARIA',
  Padaria: 'PADARIA',
  Salgados: 'SALGADOS',
};

function quantityText(quantityValue: string, quantityUnit: QuantityUnit): string {
  return `${quantityValue} ${quantityUnit.toLowerCase()}`;
}

function mapItem(item: OrderResponseDto['items'][number]): ProductLine {
  return {
    id: item.id,
    category: categoryByApiValue[item.category],
    product: item.productName,
    quantity: quantityText(item.quantityValue, item.quantityUnit),
    notes: item.notes ?? '',
  };
}

export function orderFromApi(order: OrderResponseDto): Order {
  return {
    id: order.id,
    orderNumber: Number(order.orderNumber),
    clientName: order.clientName,
    phone: order.phone ?? '',
    responsibleId: order.responsibleId ?? '',
    responsibleName: order.responsibleName ?? '',
    deliveryDate: order.deliveryDate,
    deliveryTime: order.deliveryTime ?? '',
    products: order.items.map(mapItem),
    createdAt: order.createdAt,
    version: order.version,
  };
}

export function orderFromDetailedReport(order: DetailedReportOrderDto): Order {
  return {
    id: order.id,
    orderNumber: Number(order.orderNumber),
    clientName: order.clientName,
    phone: order.phone ?? '',
    responsibleId: order.responsible?.id ?? '',
    responsibleName: order.responsible?.name ?? '',
    deliveryDate: order.deliveryDate,
    deliveryTime: order.deliveryTime ?? '',
    products: order.items.map((item) => ({
      id: item.id,
      category: categoryByApiValue[item.category],
      product: item.productName,
      quantity: quantityText(item.quantityValue, item.quantityUnit),
      notes: item.notes ?? '',
    })),
    createdAt: '',
  };
}

export function catalogProductFromApi(product: CatalogProductResponseDto): CatalogProduct {
  return { id: product.id, category: categoryByApiValue[product.category], name: product.name };
}

export function responsibleFromApi(responsible: ResponsibleResponseDto): OrderResponsible {
  return { id: responsible.id, name: responsible.name };
}

function orderItemsFromForm(form: OrderForm): CreateOrderDto['items'] {
  return form.products.map((product, position) => {
    const [quantityValue = '', quantityUnit = 'un'] = product.quantity.trim().split(/\s+/, 2);
    return {
      category: apiCategoryByCategory[product.category],
      productName: product.product,
      quantityValue: quantityValue.replace(',', '.'),
      quantityUnit: quantityUnit.toUpperCase() as QuantityUnit,
      notes: product.notes || undefined,
      position,
    };
  });
}

export function createOrderFromForm(form: OrderForm): CreateOrderDto {
  return {
    clientName: form.clientName,
    phone: form.phone || undefined,
    responsibleId: form.responsibleId || undefined,
    deliveryDate: form.deliveryDate,
    deliveryTime: form.deliveryTime || undefined,
    items: orderItemsFromForm(form),
  };
}

export function updateOrderFromForm(form: OrderForm, version: number): UpdateOrderDto {
  return {
    ...createOrderFromForm(form),
    version,
  };
}

export function summaryFromApi(summary: ProductionSummaryResponseDto) {
  return summary.groups.map((group) => ({
    category: categoryByApiValue[group.category],
    products: group.items.map((item) => ({
      category: categoryByApiValue[item.category],
      product: item.productName,
      amount: Number(item.quantityValue),
      unit: item.quantityUnit,
      count: item.orderCount,
      displayQuantity: `${item.quantityValue} ${item.quantityUnit.toLowerCase()}`,
    })),
  }));
}

export function categoryToApi(category: Category | 'Todas'): ProductCategory | undefined {
  return category === 'Todas' ? undefined : apiCategoryByCategory[category];
}
