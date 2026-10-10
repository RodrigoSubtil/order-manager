import { useEffect, useState } from 'react';

import { categories } from '../../../shared/lib/domain';
import { quantityUnits } from '../schemas/orderSchema';
import type { ScanDraft, ScanStatus } from '../schemas/scanDraft';

export type ScanReviewStatus = ScanStatus | 'conferido';
type Field = Exclude<keyof ScanDraft, 'items'>;
type ItemField = Exclude<keyof ScanDraft['items'][number], 'id' | 'status'>;

export function useScanReview(draft?: ScanDraft | null) {
  const [reviewed, setReviewed] = useState<Record<string, ScanReviewStatus>>({});

  useEffect(() => setReviewed({}), [draft]);

  function confirm(key: string) {
    if (draft) setReviewed((current) => ({ ...current, [key]: 'conferido' }));
  }

  function fieldStatus(field: Field): ScanReviewStatus | undefined {
    if (!draft) return undefined;
    if (reviewed[field]) return reviewed[field];
    return draft[field].value.trim() ? draft[field].status : 'conferir';
  }

  function itemStatus(id: string, field: ItemField): ScanReviewStatus | undefined {
    if (!draft) return undefined;
    if (reviewed[`item:${id}:${field}`]) return reviewed[`item:${id}:${field}`];
    const item = draft.items.find((candidate) => candidate.id === id);
    if (!item) return undefined;
    if (!item[field].trim()) return 'conferir';
    if (field === 'category' && !categories.includes(item.category as (typeof categories)[number]))
      return 'conferir';
    if (
      field === 'quantityUnit' &&
      !quantityUnits.includes(item.quantityUnit as (typeof quantityUnits)[number])
    )
      return 'conferir';
    return item.status;
  }

  return {
    fieldStatus,
    itemStatus,
    confirmField: (field: Field) => confirm(field),
    confirmItemField: (id: string, field: ItemField) => confirm(`item:${id}:${field}`),
    resetItemField: (id: string, field: ItemField) => {
      if (draft) setReviewed((current) => ({ ...current, [`item:${id}:${field}`]: 'conferir' }));
    },
  };
}

export type ScanReview = ReturnType<typeof useScanReview>;
