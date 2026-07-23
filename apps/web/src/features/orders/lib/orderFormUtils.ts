import { todayKey } from '../../../shared/lib/dateUtils';
import type { Category, OrderForm, ProductLine } from '../../../shared/lib/domain';

export function createProductLine(
  product = '',
  quantity = '',
  category: Category = 'Pastelaria',
  notes = '',
): ProductLine {
  return { id: crypto.randomUUID(), category, product, quantity, notes };
}

export function createEmptyForm(): OrderForm {
  return {
    orderNumber: null,
    clientName: '',
    phone: '',
    responsibleId: '',
    responsibleName: '',
    deliveryDate: todayKey(),
    deliveryTime: '',
    products: [createProductLine()],
  };
}

export function resizeTextArea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}
