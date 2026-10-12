import { useMemo, useState } from 'react';

import { Button, Card, Icon, Input, Select, Spinner } from '../../../shared/components/ui';
import { categories, type Category } from '../../../shared/lib/domain';
import type { CatalogProductRecord } from '../../../shared/lib/supabaseData';
import styles from './ManagementPanel.module.css';

export type ProductDraft = {
  id?: string;
  version?: number;
  name: string;
  category: Category;
};

type CatalogManagerProps = {
  draft: ProductDraft;
  isLoading: boolean;
  isSaving: boolean;
  items: CatalogProductRecord[];
  onDelete: (item: CatalogProductRecord) => void;
  onDraftChange: (draft: ProductDraft) => void;
  onReset: () => void;
  onSave: () => void;
};

export function CatalogManager({
  draft,
  isLoading,
  isSaving,
  items,
  onDelete,
  onDraftChange,
  onReset,
  onSave,
}: CatalogManagerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | Category>('Todas');
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-PT');
    return items.filter(
      (item) =>
        (categoryFilter === 'Todas' || item.category === categoryFilter) &&
        (!normalizedSearch || item.name.toLocaleLowerCase('pt-PT').includes(normalizedSearch)),
    );
  }, [categoryFilter, items, search]);

  return (
    <Card as="section" className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <h2>Catálogo</h2>
          <p>Adicionar novos produtos</p>
        </div>
      </header>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <label htmlFor="catalog-product-name">
          {draft.id ? 'Editar produto' : 'Novo produto'}
          <Input
            id="catalog-product-name"
            value={draft.name}
            maxLength={160}
            placeholder="Ex.: Pastel de nata"
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          />
        </label>
        <label htmlFor="catalog-product-category">
          Área
          <Select
            id="catalog-product-category"
            value={draft.category}
            onChange={(event) =>
              onDraftChange({ ...draft, category: event.target.value as Category })
            }
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </label>
        <div className={styles.formActions}>
          <Button disabled={isSaving} onClick={onReset}>
            Limpar
          </Button>
          <Button variant="primary" type="submit" disabled={isSaving || !draft.name.trim()}>
            {isSaving ? 'A guardar...' : draft.id ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </form>

      <div className={styles.tools}>
        <label htmlFor="catalog-search">
          Pesquisar produto
          <span className={styles.iconInput}>
            <Input
              id="catalog-search"
              className={styles.inputWithIcon}
              type="search"
              value={search}
              placeholder="Escreva o nome"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Icon name="search" placement="field" />
          </span>
        </label>
        <label htmlFor="catalog-category-filter">
          Filtrar por área
          <Select
            id="catalog-category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as 'Todas' | Category)}
          >
            <option value="Todas">Todas as áreas</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <section className={styles.listSection} aria-label="Lista de produtos">
        <header className={styles.listHeader}>
          <div>
            <h3>Lista de produtos</h3>
            <p>
              {filteredItems.length}{' '}
              {filteredItems.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
          </div>
        </header>
        {isLoading ? (
          <Spinner label="A carregar catálogo" />
        ) : (
          <div className={styles.list}>
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemCopy}>
                    <strong>{item.name}</strong>
                    <span>{item.category}</span>
                  </div>
                  <div className={styles.itemActions}>
                    <Button
                      onClick={() =>
                        onDraftChange({
                          id: item.id,
                          version: item.version,
                          name: item.name,
                          category: item.category,
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger-subtle"
                      disabled={isSaving}
                      onClick={() => onDelete(item)}
                    >
                      Apagar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.empty}>Nenhum produto corresponde à pesquisa.</p>
            )}
          </div>
        )}
      </section>
    </Card>
  );
}
