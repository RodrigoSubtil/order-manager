import { describe, expect, it } from 'vitest';
import type { CatalogProduct } from '../../../shared/lib/domain';
import { createBlankScanDraft } from '../schemas/scanDraft';
import { resolveScanCategories } from './resolveScanCategories';

function draft(product: string, category = '') {
  const value = createBlankScanDraft();
  value.items[0] = { ...value.items[0], product, category, status: 'provavel' };
  return value;
}
const bread: CatalogProduct = { id: 'bread', name: 'Pão de leite', category: 'Padaria' };

describe('áreas de produtos digitalizados', () => {
  it('prioriza o catálogo sem reescrever o produto nem confirmar os campos', () => {
    const original = draft('  PAO   de LEITE ', 'Pastelaria');
    const result = resolveScanCategories(original, [bread]);
    expect(result.items[0]).toEqual({ ...original.items[0], category: 'Padaria' });
    expect(original.items[0].category).toBe('Pastelaria');
    expect(result.items[0]).not.toBe(original.items[0]);
  });

  it('aceita nomes duplicados na mesma área mas deixa conflitos para revisão', () => {
    const duplicate = { ...bread, id: 'bread-2' };
    expect(resolveScanCategories(draft(bread.name), [bread, duplicate]).items[0].category).toBe(
      'Padaria',
    );
    const conflicting: CatalogProduct = { ...duplicate, category: 'Pastelaria' };
    for (const catalog of [
      [bread, conflicting],
      [conflicting, bread],
    ]) {
      expect(resolveScanCategories(draft(bread.name, 'Salgados'), catalog).items[0].category).toBe(
        '',
      );
    }
  });

  it('mantém a sugestão válida da IA quando o produto ainda não está no catálogo', () => {
    expect(
      resolveScanCategories(draft('Bolo de chocolate', 'Pastelaria'), [bread]).items[0].category,
    ).toBe('Pastelaria');
  });

  it('não usa correspondência parcial nem produtos parecidos como prova', () => {
    for (const name of ['Pão', 'Pão de leite sem lactose', 'Pão de lete']) {
      expect(resolveScanCategories(draft(name), [bread]).items[0].category).toBe('');
    }
  });

  it('não inventa áreas para produto vazio ou categorias desconhecidas', () => {
    expect(resolveScanCategories(draft('', 'Padaria'), [bread]).items[0].category).toBe('');
    expect(resolveScanCategories(draft('Produto novo', 'Bebidas'), [bread]).items[0].category).toBe(
      '',
    );
  });
});
