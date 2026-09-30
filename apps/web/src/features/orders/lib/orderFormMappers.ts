import { todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order, OrderForm } from '../../../shared/lib/domain';
import {
  getQuantityAmount,
  getQuantityUnit,
  joinQuantity,
} from '../../../shared/lib/quantityUtils';
import {
  defaultPhoneCountryCode,
  joinInternationalPhone,
  splitInternationalPhone,
} from './phoneNumber';
import { normalizeResponsibleName } from './responsibleName';
import type { OrderFormValues, OrderItemFormValues, QuantityUnit } from '../schemas/orderSchema';

function createId() {
  return crypto.randomUUID();
}

function toQuantityUnit(unit: string): QuantityUnit {
  const normalized = unit.toUpperCase();
  return normalized === 'KG' || normalized === 'G' ? normalized : 'UN';
}

export function createEmptyOrderItem(category: Category = 'Pastelaria'): OrderItemFormValues {
  return {
    id: createId(),
    category,
    product: '',
    quantityAmount: '',
    quantityUnit: 'UN',
    notes: '',
  };
}

export function createEmptyOrderFormValues(): OrderFormValues {
  return {
    orderNumber: null,
    clientName: '',
    customerId: null,
    customerVersion: null,
    originalCustomerName: '',
    originalCustomerPhone: '',
    phoneCountryCode: defaultPhoneCountryCode,
    phone: '',
    responsibleId: '',
    responsibleName: '',
    deliveryDate: todayKey(),
    deliveryTime: '',
    items: [createEmptyOrderItem()],
  };
}

export function orderToFormValues(order: Order): OrderFormValues {
  const phone = splitInternationalPhone(order.phone);
  return {
    orderNumber: order.orderNumber,
    clientName: order.clientName,
    customerId: order.customerId ?? null,
    customerVersion: order.customerVersion ?? null,
    originalCustomerName: order.clientName,
    originalCustomerPhone: order.phone,
    originalDeliveryDate: order.deliveryDate,
    originalDeliveryTime: order.deliveryTime,
    phoneCountryCode: phone.countryCode,
    phone: phone.nationalNumber,
    responsibleId: order.responsibleId,
    responsibleName: order.responsibleName,
    deliveryDate: order.deliveryDate,
    deliveryTime: order.deliveryTime,
    items: order.products.map((product) => ({
      id: product.id,
      category: product.category,
      product: product.product,
      quantityAmount: getQuantityAmount(product.quantity).replace(',', '.'),
      quantityUnit: toQuantityUnit(getQuantityUnit(product.quantity)),
      notes: product.notes,
    })),
  };
}

export function formValuesToOrderForm(values: OrderFormValues): OrderForm {
  const internationalPhone = joinInternationalPhone(values.phoneCountryCode, values.phone);
  return {
    orderNumber: values.orderNumber,
    clientName: values.clientName.trim(),
    customerId: values.customerId ?? null,
    customerVersion: values.customerVersion ?? null,
    updateCustomer: Boolean(
      values.customerId &&
      (values.clientName.trim() !== values.originalCustomerName ||
        internationalPhone !== values.originalCustomerPhone),
    ),
    phone: internationalPhone,
    responsibleId: values.responsibleId,
    responsibleName: normalizeResponsibleName(values.responsibleName),
    deliveryDate: values.deliveryDate,
    deliveryTime: values.deliveryTime,
    products: values.items.map((item) => ({
      id: item.id,
      category: item.category,
      product: item.product.trim(),
      quantity: joinQuantity(item.quantityAmount, item.quantityUnit.toLowerCase()),
      notes: item.notes.trim(),
    })),
  };
}
