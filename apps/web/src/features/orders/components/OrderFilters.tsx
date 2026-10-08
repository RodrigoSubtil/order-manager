import { useState } from 'react';

import {
  Button,
  Combobox,
  ComboboxInput,
  ComboboxList,
  ComboboxOption,
  ComboboxTrigger,
  DatePicker,
  Icon,
  Input,
} from '../../../shared/components/ui';
import { formatDate } from '../../../shared/lib/dateUtils';
import { categories, type Category } from '../../../shared/lib/domain';
import type { DateFilterMode } from '../hooks/useOrderFilters';
import styles from './OrderFilters.module.css';

type OrderFiltersProps = {
  categoryFilter: 'Todas' | Category;
  dateFilter: string;
  dateFilterMode: DateFilterMode;
  hasCustomDate: boolean;
  isCategoryFilterOpen: boolean;
  resultCount: number;
  search: string;
  onCategoryChange: (category: 'Todas' | Category) => void;
  onCategoryOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onScan?: () => void;
  onDateChange: (date: string) => void;
  onDateModeChange: (mode: DateFilterMode) => void;
  onPrint: () => void;
  onSearchChange: (search: string) => void;
};

export function OrderFilters({
  categoryFilter,
  dateFilter,
  dateFilterMode,
  hasCustomDate,
  isCategoryFilterOpen,
  resultCount,
  search,
  onCategoryChange,
  onCategoryOpenChange,
  onCreate,
  onScan,
  onDateChange,
  onDateModeChange,
  onPrint,
  onSearchChange,
}: OrderFiltersProps) {
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const selectedDateLabel = dateFilter
    ? new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(`${dateFilter}T12:00:00`))
    : 'Definir data';
  const dateOptions: Array<{ mode: DateFilterMode; label: string }> = [
    { mode: 'all', label: 'Todas as datas' },
    { mode: 'today', label: 'Hoje' },
    { mode: 'custom', label: 'Definir data' },
  ];

  return (
    <>
      <div className={styles.toolbar}>
        <div className={`${styles.topRow} ${onScan ? styles.topRowWithScan : ''}`}>
          <Combobox
            className={styles.areaFilter}
            id="category-filter"
            isOpen={isCategoryFilterOpen}
            onOpenChange={onCategoryOpenChange}
          >
            <ComboboxInput
              className={styles.categoryInput}
              aria-label="Filtrar por área"
              value={categoryFilter === 'Todas' ? 'Todas as áreas' : categoryFilter}
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

          <Combobox
            className={styles.dateFilter}
            id="date-filter"
            isOpen={isDateFilterOpen}
            onOpenChange={setIsDateFilterOpen}
          >
            <ComboboxInput
              className={styles.dateFilterInput}
              aria-label="Filtrar por data"
              value={
                dateFilterMode === 'custom' && hasCustomDate
                  ? selectedDateLabel
                  : (dateOptions.find((option) => option.mode === dateFilterMode)?.label ?? 'Hoje')
              }
              readOnly
              onClick={() => setShowCalendar(false)}
            />
            <ComboboxTrigger
              aria-label="Mostrar opções de data"
              onClick={() => setShowCalendar(false)}
            />
            <ComboboxList>
              {dateOptions.map(({ mode, label }) => (
                <ComboboxOption
                  key={mode}
                  aria-selected={mode === dateFilterMode}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onDateModeChange(mode);
                    setIsDateFilterOpen(false);
                    setShowCalendar(mode === 'custom');
                  }}
                >
                  {label}
                </ComboboxOption>
              ))}
            </ComboboxList>
            {showCalendar && dateFilterMode === 'custom' && (
              <DatePicker
                autoOpen
                hideTrigger
                className={styles.dateControl}
                aria-label="Escolher data do filtro"
                value={dateFilter}
                onChange={onDateChange}
                onClose={() => setShowCalendar(false)}
              />
            )}
          </Combobox>

          {onScan && (
            <Button
              className={`${styles.action} ${styles.scan}`}
              aria-label="Digitalizar encomenda"
              title="Digitalizar encomenda"
              onClick={onScan}
            >
              <svg
                className={styles.scanIcon}
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7h4l1.5-2h7L17 7h4v12H3z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </Button>
          )}
          <Button
            className={`${styles.action} ${styles.create}`}
            variant="primary"
            aria-label="Nova encomenda"
            title="Nova encomenda"
            onClick={onCreate}
          >
            <span aria-hidden="true">+</span>
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
        </div>

        <div className={styles.searchControl}>
          <Input
            className={styles.search}
            aria-label="Pesquisar encomendas"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Pesquisar encomendas"
          />
          <Icon name="search" placement="field" />
        </div>
      </div>

      <div className={styles.active} aria-live="polite">
        <div className={styles.activeSummary}>
          <span className={styles.chip}>data: {dateFilter ? formatDate(dateFilter) : 'todas'}</span>
          <span className={styles.chip}>
            área: {categoryFilter === 'Todas' ? 'todas' : categoryFilter}
          </span>
        </div>
        <strong className={styles.resultCount}>
          {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
        </strong>
      </div>
    </>
  );
}
