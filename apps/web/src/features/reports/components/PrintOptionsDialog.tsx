import { useState } from 'react';

import {
  Alert,
  Button,
  Combobox,
  ComboboxInput,
  ComboboxList,
  ComboboxOption,
  ComboboxTrigger,
  DatePicker,
  Dialog,
  DialogActions,
  DialogHeader,
  FormMessage,
  Input,
} from '../../../shared/components/ui';
import { categories } from '../../../shared/lib/domain';
import type { PrintCategory, PrintMode } from '../hooks/usePrintOrders';
import styles from './PrintOptionsDialog.module.css';

type PrintOptionsDialogProps = {
  error?: string;
  isPreparing?: boolean;
  orderCount: number;
  printCategory: PrintCategory;
  printFrom: string;
  printFromTime: string;
  printMode: PrintMode;
  printUntil: string;
  printUntilTime: string;
  onCancel: () => void;
  onCategoryChange: (category: PrintCategory) => void;
  onConfirm: () => void;
  onFromChange: (value: string) => void;
  onFromTimeChange: (value: string) => void;
  onModeChange: (mode: PrintMode) => void;
  onUntilChange: (value: string) => void;
  onUntilTimeChange: (value: string) => void;
};

export function PrintOptionsDialog({
  error = '',
  isPreparing = false,
  orderCount,
  printCategory,
  printFrom,
  printFromTime,
  printMode,
  printUntil,
  printUntilTime,
  onCancel,
  onCategoryChange,
  onConfirm,
  onFromChange,
  onFromTimeChange,
  onModeChange,
  onUntilChange,
  onUntilTimeChange,
}: PrintOptionsDialogProps) {
  const [isAreaOpen, setIsAreaOpen] = useState(false);
  const hasValidRange = Boolean(printFrom && printUntil && printUntil >= printFrom);
  const hasValidTimes =
    /^([01]\d|2[0-3]):[0-5]\d$/.test(printFromTime) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(printUntilTime);
  const hasValidDateTimeRange =
    hasValidRange &&
    hasValidTimes &&
    `${printFrom}T${printFromTime}` <= `${printUntil}T${printUntilTime}`;

  return (
    <Dialog className={styles.content} titleId="print-options-title" onClose={onCancel}>
      <DialogHeader title="Impressão" titleId="print-options-title" />
      <div className={styles.body}>
        {error && <Alert tone="error">{error}</Alert>}
        <fieldset className={styles.section}>
          <legend>Datas</legend>
          <div className={styles.dateGrid}>
            <label htmlFor="print-from">
              Data inicial
              <DatePicker
                id="print-from"
                value={printFrom}
                onChange={onFromChange}
                calendarInViewport
                required
              />
            </label>
            <label htmlFor="print-until">
              Data final
              <DatePicker
                id="print-until"
                value={printUntil}
                minDate={printFrom}
                onChange={onUntilChange}
                calendarInViewport
                required
              />
            </label>
          </div>
          <div data-form-field>
            <div className={styles.timeGrid}>
              <label htmlFor="print-from-time">
                Hora inicial
                <Input
                  id="print-from-time"
                  type="time"
                  value={printFromTime}
                  required
                  onChange={(event) => onFromTimeChange(event.target.value)}
                />
              </label>
              <label htmlFor="print-until-time">
                Hora final
                <Input
                  id="print-until-time"
                  type="time"
                  value={printUntilTime}
                  required
                  onChange={(event) => onUntilTimeChange(event.target.value)}
                />
              </label>
            </div>
            <FormMessage>Serão consideradas apenas encomendas entre estes horários.</FormMessage>
          </div>
        </fieldset>
        <fieldset className={styles.section}>
          <legend>Áreas</legend>
          <Combobox id="print-category" isOpen={isAreaOpen} onOpenChange={setIsAreaOpen}>
            <ComboboxInput aria-label="Áreas" value={printCategory} readOnly />
            <ComboboxTrigger aria-label="Mostrar áreas da impressão" />
            <ComboboxList>
              {(['Todas', ...categories] as PrintCategory[]).map((category) => (
                <ComboboxOption
                  key={category}
                  aria-selected={category === printCategory}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onCategoryChange(category);
                    setIsAreaOpen(false);
                  }}
                >
                  {category}
                </ComboboxOption>
              ))}
            </ComboboxList>
          </Combobox>
        </fieldset>
        <fieldset className={styles.section}>
          <legend>Formato de impressão</legend>
          <div className={styles.radioGrid}>
            <label className={styles.radio}>
              <input
                type="radio"
                name="printMode"
                checked={printMode === 'orders'}
                onChange={() => onModeChange('orders')}
              />
              <span>Encomendas detalhadas</span>
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="printMode"
                checked={printMode === 'summary'}
                onChange={() => onModeChange('summary')}
              />
              <span>Quantidade geral de produtos</span>
            </label>
          </div>
        </fieldset>
        <div className={styles.details} aria-live="polite">
          {orderCount} {orderCount === 1 ? 'encomenda encontrada' : 'encomendas encontradas'}
        </div>
      </div>
      <DialogActions>
        <Button variant="danger-subtle" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={!orderCount || isPreparing || !hasValidDateTimeRange || Boolean(error)}
          onClick={onConfirm}
        >
          {isPreparing ? 'A preparar...' : 'Imprimir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
