import { z } from 'zod';

import { currentTimeKey, todayKey } from '../../../shared/lib/dateUtils';
import { categories } from '../../../shared/lib/domain';

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
  quantityUnit: z.enum(quantityUnits, { message: 'Escolha uma unidade válida.' }),
  notes: z.string().trim().max(1000, 'A observação é demasiado longa.'),
});

export const orderSchema = z
  .object({
    orderNumber: z.number().nullable(),
    clientName: z
      .string()
      .trim()
      .min(2, 'Indique o nome do cliente.')
      .max(160, 'O nome do cliente é demasiado longo.'),
    phone: z
      .string()
      .trim()
      .min(1, 'Indique o telefone.')
      .refine((value) => /^\d{9,15}$/.test(value), {
        message: 'Use entre 9 e 15 dígitos no telefone.',
      }),
    responsibleId: z.string().trim().min(1, 'Escolha um responsável da lista.'),
    responsibleName: z.string().trim().min(1, 'Escolha um responsável da lista.'),
    deliveryDate: z
      .string()
      .min(1, 'Indique a data de entrega.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data válida.')
      .refine(isValidCalendarDate, 'Use uma data válida.')
      .refine(
        (value) => !isValidCalendarDate(value) || value >= todayKey(),
        'A data de entrega não pode ser anterior a hoje.',
      ),
    deliveryTime: z
      .string()
      .trim()
      .min(1, 'Indique a hora de entrega.')
      .refine((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
        message: 'Use uma hora válida no formato HH:mm.',
      }),
    items: z.array(orderItemSchema).min(1, 'Adicione pelo menos um produto.'),
  })
  .superRefine((order, context) => {
    if (
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
