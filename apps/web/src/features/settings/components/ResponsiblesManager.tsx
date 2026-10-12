import { useMemo, useState } from 'react';

import { Button, Card, Icon, Input, Spinner } from '../../../shared/components/ui';
import type { ResponsibleRecord } from '../../../shared/lib/supabaseData';
import styles from './ManagementPanel.module.css';

export type ResponsibleDraft = {
  id?: string;
  version?: number;
  name: string;
};

type ResponsiblesManagerProps = {
  draft: ResponsibleDraft;
  isLoading: boolean;
  isSaving: boolean;
  items: ResponsibleRecord[];
  onDelete: (item: ResponsibleRecord) => void;
  onDraftChange: (draft: ResponsibleDraft) => void;
  onReset: () => void;
  onSave: () => void;
};

export function ResponsiblesManager({
  draft,
  isLoading,
  isSaving,
  items,
  onDelete,
  onDraftChange,
  onReset,
  onSave,
}: ResponsiblesManagerProps) {
  const [search, setSearch] = useState('');
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-PT');
    return items.filter(
      (item) =>
        !normalizedSearch || item.name.toLocaleLowerCase('pt-PT').includes(normalizedSearch),
    );
  }, [items, search]);

  return (
    <Card as="section" className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <h2>Equipa</h2>
          <p>Adicionar novos responsáveis</p>
        </div>
      </header>

      <form
        className={`${styles.form} ${styles.singleForm}`}
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <label htmlFor="responsible-name">
          {draft.id ? 'Editar responsável' : 'Novo responsável'}
          <Input
            id="responsible-name"
            value={draft.name}
            maxLength={160}
            placeholder="Ex.: Maria Helena"
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          />
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

      <div className={`${styles.tools} ${styles.singleTool}`}>
        <label htmlFor="responsibles-search">
          Pesquisar responsável
          <span className={styles.iconInput}>
            <Input
              id="responsibles-search"
              className={styles.inputWithIcon}
              type="search"
              value={search}
              placeholder="Escreva o nome"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Icon name="search" placement="field" />
          </span>
        </label>
      </div>

      <section className={styles.listSection} aria-label="Lista de responsáveis">
        <header className={styles.listHeader}>
          <div>
            <h3>Lista de responsáveis</h3>
            <p>
              {filteredItems.length}{' '}
              {filteredItems.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}
            </p>
          </div>
        </header>
        {isLoading ? (
          <Spinner label="A carregar responsáveis" />
        ) : (
          <div className={styles.list}>
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemCopy}>
                    <strong>{item.name}</strong>
                    <span>Responsável por encomendas</span>
                  </div>
                  <div className={styles.itemActions}>
                    <Button
                      onClick={() =>
                        onDraftChange({
                          id: item.id,
                          version: item.version,
                          name: item.name,
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
              <p className={styles.empty}>Nenhum responsável corresponde à pesquisa.</p>
            )}
          </div>
        )}
      </section>
    </Card>
  );
}
