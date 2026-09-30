import { z } from 'zod';

import { currentTimeKey, todayKey } from '../../../shared/lib/dateUtils';
import { categories } from '../../../shared/lib/domain';
import { joinInternationalPhone } from '../lib/phoneNumber';

export const quantityUnits = ['UN', 'KG', 'G'] as const;

function isValidCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const orderItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum(categories),
  product: z
    .string()
    .trim()
    .min(1, 'Indique o produto.')
    .max(160, 'O nome do produto é demasiado longo.'),
  quantityAmount: z
    .string()
    .trim()
    .min(1, 'Indique a quantidade.')
    .refine((value) => {
      const amount = Number(value.replace(',', '.'));
      return Number.isFinite(amount) && amount >= 1;
    }, 'A quantidade deve ser no mínimo 1.')
    .refine((value) => Number(value.replace(',', '.')) <= 1000, {
      message: 'A quantidade deve ser no máximo 1000.',
    }),
  quantityUnit: z.enum(quantityUnits, {
    message: 'Escolha uma unidade válida.',
  }),
  notes: z.string().trim().max(1000, 'A observação é demasiado longa.'),
});

export const orderSchema = z
  .object({
    orderNumber: z.number().nullable(),
    customerId: z.string().uuid().nullable().optional(),
    customerVersion: z.number().int().positive().nullable().optional(),
    originalCustomerName: z.string().optional(),
    originalCustomerPhone: z.string().optional(),
    originalDeliveryDate: z.string().optional(),
    originalDeliveryTime: z.string().optional(),
    clientName: z
      .string()
      .trim()
      .min(2, 'Indique o nome do cliente.')
      .max(160, 'O nome do cliente é demasiado longo.'),
    phoneCountryCode: z
      .string()
      .regex(/^\d{1,3}$/, 'Escolha um país ou indique um prefixo de 1 a 3 dígitos.'),
    phone: z
      .string()
      .trim()
      .min(1, 'Indique o telefone.')
      .refine((value) => /^\d{6,14}$/.test(value), {
        message: 'Use entre 6 e 14 dígitos no número.',
      }),
    responsibleId: z.string().trim(),
    responsibleName: z
      .string()
      .trim()
      .min(2, 'Indique o nome do responsável.')
      .max(160, 'O nome do responsável é demasiado longo.'),
    deliveryDate: z
      .string()
      .min(1, 'Indique a data de entrega.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data válida.')
      .refine(isValidCalendarDate, 'Use uma data válida.'),
    deliveryTime: z
      .string()
      .trim()
      .min(1, 'Indique a hora de entrega.')
      .refine((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
        message: 'Use uma hora válida no formato HH:mm.',
      }),
    items: z
      .array(orderItemSchema)
      .min(1, 'Adicione pelo menos um produto.')
      .max(100, 'Uma encomenda pode ter no máximo 100 produtos.'),
  })
  .superRefine((order, context) => {
    const internationalPhone = joinInternationalPhone(order.phoneCountryCode, order.phone);
    if (internationalPhone.length < 9 || internationalPhone.length > 15) {
      context.addIssue({
        code: 'custom',
        message: 'O telefone completo deve ter entre 9 e 15 dígitos.',
        path: ['phone'],
      });
    }
    if (order.phoneCountryCode === '351' && /^\d+$/.test(order.phone) && order.phone.length !== 9) {
      context.addIssue({
        code: 'custom',
        message: 'O número de Portugal deve ter 9 dígitos.',
        path: ['phone'],
      });
    }
    if (
      order.phoneCountryCode === '55' &&
      /^\d+$/.test(order.phone) &&
      ![10, 11].includes(order.phone.length)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Inclua o DDD e o número do Brasil (10 ou 11 dígitos).',
        path: ['phone'],
      });
    }
    const unchangedSchedule =
      order.deliveryDate === order.originalDeliveryDate &&
      order.deliveryTime === order.originalDeliveryTime;
    if (!unchangedSchedule && order.deliveryTime && !/^\d{2}:(00|30)$/.test(order.deliveryTime)) {
      context.addIssue({
        code: 'custom',
        message: 'Escolha a hora de meia em meia hora.',
        path: ['deliveryTime'],
      });
    }
    if (!unchangedSchedule && order.deliveryDate < todayKey()) {
      context.addIssue({
        code: 'custom',
        message: 'A data de entrega não pode ser anterior a hoje.',
        path: ['deliveryDate'],
      });
    }
    if (order.deliveryTime && (order.deliveryTime < '08:00' || order.deliveryTime > '21:00')) {
      if (!unchangedSchedule)
        context.addIssue({
          code: 'custom',
          message: 'A entrega deve ser entre 08:00 e 21:00.',
          path: ['deliveryTime'],
        });
    }
    if (
      !unchangedSchedule &&
      order.deliveryDate === todayKey() &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(order.deliveryTime) &&
      order.deliveryTime < currentTimeKey()
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A hora de entrega não pode ser anterior ao momento atual.',
        path: ['deliveryTime'],
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderSchema>;
export type OrderItemFormValues = z.infer<typeof orderItemSchema>;
export type QuantityUnit = (typeof quantityUnits)[number];
