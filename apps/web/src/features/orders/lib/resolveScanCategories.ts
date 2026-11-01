import { categories, type CatalogProduct, type Category } from '../../../shared/lib/domain';
import type { ScanDraft } from '../schemas/scanDraft';

function productKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-PT');
}

export function resolveScanCategories(draft: ScanDraft, catalog: CatalogProduct[]): ScanDraft {
  const byName = new Map<string, Set<Category>>();
  for (const product of catalog) {
    const key = productKey(product.name);
    if (!key || !categories.includes(product.category)) continue;
    const areas = byName.get(key) ?? new Set<Category>();
    areas.add(product.category);
    byName.set(key, areas);
  }
  return {
    ...draft,
    items: draft.items.map((item) => {
      const key = productKey(item.product);
      const areas = byName.get(key);
      const suggestion = categories.includes(item.category as Category) ? item.category : '';
      // A conflicting catalog match requires a human choice, never the first result.
      const category = !key ? '' : areas ? (areas.size === 1 ? [...areas][0] : '') : suggestion;
      return { ...item, category };
    }),
  };
}
