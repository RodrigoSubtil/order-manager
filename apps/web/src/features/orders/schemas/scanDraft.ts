import { z } from 'zod';

import { categories } from '../../../shared/lib/domain';
import { splitInternationalPhone } from '../lib/phoneNumber';
import type { OrderFormValues, QuantityUnit } from './orderSchema';

export const scanStatusSchema = z.enum(['provavel', 'conferir']);

const scanFieldSchema = z.object({
  value: z.string().max(1000),
  status: scanStatusSchema,
});

const scanItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().max(40),
  product: z.string().max(160),
  quantityAmount: z.string().max(30),
  quantityUnit: z.string().max(10),
  notes: z.string().max(1000),
  status: scanStatusSchema,
});

export const scanDraftSchema = z.object({
  clientName: scanFieldSchema,
  phone: scanFieldSchema,
  responsibleName: scanFieldSchema,
  deliveryDate: scanFieldSchema,
  deliveryTime: scanFieldSchema,
  items: z.array(scanItemSchema).min(1).max(100),
});

export type ScanDraft = z.infer<typeof scanDraftSchema>;
export type ScanStatus = z.infer<typeof scanStatusSchema>;

export function createBlankScanItem(): ScanDraft['items'][number] {
  return {
    id: crypto.randomUUID(),
    category: '',
    product: '',
    quantityAmount: '',
    quantityUnit: '',
    notes: '',
    status: 'conferir',
  };
}

export function createBlankScanDraft(): ScanDraft {
  const missing = () => ({ value: '', status: 'conferir' as const });
  return {
    clientName: missing(),
    phone: missing(),
    responsibleName: missing(),
    deliveryDate: missing(),
    deliveryTime: missing(),
    items: [createBlankScanItem()],
  };
}

export function scanDraftToOrderValues(draft: ScanDraft): OrderFormValues {
  const phone = splitInternationalPhone(draft.phone.value);
  return {
    orderNumber: null,
    clientName: draft.clientName.value.trim(),
    customerId: null,
    customerVersion: null,
    originalCustomerName: '',
    originalCustomerPhone: '',
    phoneCountryCode: phone.countryCode || '351',
    phone: phone.nationalNumber,
    responsibleId: '',
    responsibleName: draft.responsibleName.value.trim(),
    deliveryDate: draft.deliveryDate.value,
    deliveryTime: draft.deliveryTime.value,
    items: draft.items.map((item) => ({
      id: item.id,
      category: categories.includes(item.category as (typeof categories)[number])
        ? (item.category as (typeof categories)[number])
        : ('' as (typeof categories)[number]),
      product: item.product.trim(),
      quantityAmount: item.quantityAmount.trim(),
      quantityUnit: ['UN', 'KG', 'G'].includes(item.quantityUnit)
        ? (item.quantityUnit as QuantityUnit)
        : ('' as QuantityUnit),
      notes: item.notes.trim(),
    })),
  };
}
