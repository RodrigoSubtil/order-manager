import {
  Button,
  Combobox,
  ComboboxInput,
  ComboboxList,
  ComboboxOption,
  ComboboxTrigger,
  DatePicker,
  Input,
} from '../../../shared/components/ui';
import { formatDate, todayKey } from '../../../shared/lib/dateUtils';
import { categories, type Category } from '../../../shared/lib/domain';
import styles from './OrderFilters.module.css';

type OrderFiltersProps = {
  categoryFilter: 'Todas' | Category;
  dateFilter: string;
  isCategoryFilterOpen: boolean;
  search: string;
  onCategoryChange: (category: 'Todas' | Category) => void;
  onCategoryOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onDateChange: (date: string) => void;
  onPrint: () => void;
  onSearchChange: (search: string) => void;
};

export function OrderFilters({
  categoryFilter,
  dateFilter,
  isCategoryFilterOpen,
  search,
  onCategoryChange,
  onCategoryOpenChange,
  onCreate,
  onDateChange,
  onPrint,
  onSearchChange,
}: OrderFiltersProps) {
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.topRow}>
          <div className={styles.dateControl}>
            <DatePicker
              className={styles.dateInput}
              aria-label="Filtrar por data"
              value={dateFilter}
              onChange={onDateChange}
              withClearAction
            />
          </div>

          <Combobox
            id="category-filter"
            isOpen={isCategoryFilterOpen}
            onOpenChange={onCategoryOpenChange}
          >
            <ComboboxInput
              className={styles.categoryInput}
              aria-label="Filtrar por área"
              value={categoryFilter}
              readOnly
            />
            <ComboboxTrigger
              className={styles.categoryTrigger}
              aria-label="Mostrar áreas do filtro"
            />
            <ComboboxList>
              {(['Todas', ...categories] as Array<'Todas' | Category>).map((category) => (
                <ComboboxOption
                  key={category}
                  aria-selected={category === categoryFilter}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onCategoryChange(category);
                    onCategoryOpenChange(false);
                  }}
                >
                  {category === 'Todas' ? 'Todas as áreas' : category}
                </ComboboxOption>
              ))}
            </ComboboxList>
          </Combobox>

          <Button className={styles.filterButton} onClick={() => onDateChange(todayKey())}>
            Hoje
          </Button>
          <Button className={styles.filterButton} onClick={() => onDateChange('')}>
            Todas as datas
          </Button>
          <Button
            className={`${styles.action} ${styles.print}`}
            aria-label="Imprimir todas"
            title="Imprimir todas"
            onClick={onPrint}
          >
            <svg
              className={styles.printIcon}
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
            >
              <path d="M6 9V3h12v6" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v7H6z" />
              <path d="M17 12h.01" />
            </svg>
          </Button>
          <Button
            className={`${styles.action} ${styles.create}`}
            variant="primary"
            aria-label="Nova encomenda"
            title="Nova encomenda"
            onClick={onCreate}
          >
            <span aria-hidden="true">+</span>
          </Button>
        </div>

        <Input
          className={styles.search}
          aria-label="Pesquisar encomendas"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Pesquisar por cliente, telefone ou produto"
        />
      </div>

      <div className={styles.active} aria-live="polite">
        <span className={styles.activeTitle}>Filtros:</span>
        <span className={styles.chip}>
          Data: {dateFilter ? formatDate(dateFilter) : 'Todas as datas'}
        </span>
        <span className={styles.chip}>Área: {categoryFilter}</span>
      </div>
    </>
  );
}
