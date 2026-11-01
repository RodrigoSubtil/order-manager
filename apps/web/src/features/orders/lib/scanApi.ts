import { supabase } from '../../../shared/lib/supabase';
import { scanDraftSchema, type ScanDraft } from '../schemas/scanDraft';

export const orderScanEnabled = import.meta.env.VITE_ORDER_SCAN_ENABLED === 'true';

export async function interpretOrderPhoto(photo?: File): Promise<ScanDraft> {
  if (!orderScanEnabled) throw new Error('A digitalização não está ativada neste ambiente.');
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
