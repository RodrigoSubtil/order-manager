import { supabase } from '../../../shared/lib/supabase';
import { scanDraftSchema, type ScanDraft, type ScanStatus } from '../schemas/scanDraft';

export const orderScanEnabled = import.meta.env.VITE_ORDER_SCAN_ENABLED === 'true';
export const orderScanDemo = import.meta.env.DEV && import.meta.env.VITE_ORDER_SCAN_DEMO === 'true';

function nextDayInLisbon() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now() + 86_400_000));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function field(value: string, status: ScanStatus = 'provavel') {
  return { value, status };
}

function demoDraft(): ScanDraft {
  return {
    clientName: field('Maria Fonseca', 'conferir'),
    phone: field('935654112', 'conferir'),
    responsibleName: field('', 'conferir'),
    deliveryDate: field(nextDayInLisbon()),
    deliveryTime: field('10:00'),
    items: [
      {
        id: crypto.randomUUID(),
        category: 'Pastelaria',
        product: 'Bolo de brigadeiro',
        quantityAmount: '2',
        quantityUnit: 'KG',
        notes: '',
        status: 'provavel',
      },
    ],
  };
}

export async function interpretOrderPhoto(photo?: File): Promise<ScanDraft> {
  if (!orderScanEnabled) throw new Error('A digitalização não está ativada neste ambiente.');
  if (orderScanDemo) return demoDraft();
  if (!photo) throw new Error('Selecione uma fotografia antes de interpretar.');

  const body = new FormData();
  body.append('photo', photo, photo.name);
  const { data, error } = await supabase.functions.invoke('interpret-order', { body });
  if (error) {
    if (error.context instanceof Response) {
      const detail: unknown = await error.context.json().catch(() => null);
      if (
        detail &&
        typeof detail === 'object' &&
        'error' in detail &&
        typeof detail.error === 'string'
      )
        throw new Error(detail.error);
    }
    throw new Error('Não foi possível interpretar a foto. Tente novamente mais tarde.');
  }
  const parsed = scanDraftSchema.safeParse(data);
  if (!parsed.success)
    throw new Error('A interpretação veio incompleta. Pode preencher manualmente.');
  return parsed.data;
}
