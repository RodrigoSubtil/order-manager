import { Button, Dialog, Input } from '../../../shared/components/ui';
import type { PrintMode, PrintRangeMode } from '../hooks/usePrintOrders';
import styles from './PrintOptionsDialog.module.css';

type PrintOptionsDialogProps = {
  orderCount: number;
  isPreparing?: boolean;
  printFrom: string;
  printMode: PrintMode;
  printRangeMode: PrintRangeMode;
  printUntil: string;
  onCancel: () => void;
  onConfirm: () => void;
  onFromChange: (value: string) => void;
  onModeChange: (mode: PrintMode) => void;
  onRangeModeChange: (mode: PrintRangeMode) => void;
  onUntilChange: (value: string) => void;
};

export function PrintOptionsDialog({
  orderCount,
  isPreparing = false,
  printFrom,
  printMode,
  printRangeMode,
  printUntil,
  onCancel,
  onConfirm,
  onFromChange,
  onModeChange,
  onRangeModeChange,
  onUntilChange,
}: PrintOptionsDialogProps) {
  return (
    <Dialog className={styles.content} titleId="print-options-title" onClose={onCancel}>
      <span data-eyebrow>Impressão</span>
      <h2 id="print-options-title">Escolha o que deseja imprimir</h2>
      <fieldset className={styles.section}>
        <legend>Período</legend>
        <div className={styles.radioGrid}>
          <label className={styles.radio}>
            <input
              type="radio"
              name="printRangeMode"
              checked={printRangeMode === 'day'}
              onChange={() => {
                onRangeModeChange('day');
                onUntilChange(printFrom);
              }}
            />
            <span>Somente um dia</span>
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="printRangeMode"
              checked={printRangeMode === 'period'}
              onChange={() => onRangeModeChange('period')}
            />
            <span>De uma data até outra</span>
          </label>
        </div>
        <div className={styles.dateGrid}>
          <label htmlFor="print-from">
            Data inicial
            <Input
              id="print-from"
              type="date"
              value={printFrom}
              onChange={(event) => {
                onFromChange(event.target.value);
                if (printRangeMode === 'day') onUntilChange(event.target.value);
              }}
            />
          </label>
          <label htmlFor="print-until">
            Data final
            <Input
              id="print-until"
              type="date"
              value={printUntil}
              disabled={printRangeMode === 'day'}
              onChange={(event) => onUntilChange(event.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <fieldset className={styles.section}>
        <legend>Formato</legend>
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
            <span>Resumo por produto e secção</span>
          </label>
        </div>
      </fieldset>
      <div className={styles.details} aria-live="polite">
        {orderCount} {orderCount === 1 ? 'encomenda encontrada' : 'encomendas encontradas'}
      </div>
      <div className={styles.actions}>
        <Button data-autofocus onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={!orderCount || isPreparing} onClick={onConfirm}>
          {isPreparing ? 'A preparar...' : 'Imprimir'}
        </Button>
      </div>
    </Dialog>
  );
}
