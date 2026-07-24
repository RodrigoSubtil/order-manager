import { Alert, Button, Dialog, Input } from '../../../shared/components/ui';
import type { PrintMode, PrintRangeMode } from '../hooks/usePrintOrders';
import styles from './PrintOptionsDialog.module.css';

type PrintOptionsDialogProps = {
  error?: string;
  isPreparing?: boolean;
  orderCount: number;
  printFrom: string;
  printFromTime: string;
  printMode: PrintMode;
  printRangeMode: PrintRangeMode;
  printUntil: string;
  printUntilTime: string;
  onCancel: () => void;
  onConfirm: () => void;
  onFromChange: (value: string) => void;
  onFromTimeChange: (value: string) => void;
  onModeChange: (mode: PrintMode) => void;
  onRangeModeChange: (mode: PrintRangeMode) => void;
  onUntilChange: (value: string) => void;
  onUntilTimeChange: (value: string) => void;
};

export function PrintOptionsDialog({
  error = '',
  isPreparing = false,
  orderCount,
  printFrom,
  printFromTime,
  printMode,
  printRangeMode,
  printUntil,
  printUntilTime,
  onCancel,
  onConfirm,
  onFromChange,
  onFromTimeChange,
  onModeChange,
  onRangeModeChange,
  onUntilChange,
  onUntilTimeChange,
}: PrintOptionsDialogProps) {
  const finalDate = printRangeMode === 'day' ? printFrom : printUntil;
  const hasValidRange = Boolean(printFrom && finalDate && finalDate >= printFrom);
  const hasValidTimes =
    /^([01]\d|2[0-3]):[0-5]\d$/.test(printFromTime) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(printUntilTime);
  const hasValidDateTimeRange =
    hasValidRange &&
    hasValidTimes &&
    `${printFrom}T${printFromTime}` <= `${finalDate}T${printUntilTime}`;

  return (
    <Dialog className={styles.content} titleId="print-options-title" onClose={onCancel}>
      <span data-eyebrow>Impressão</span>
      <h2 id="print-options-title">Escolha o que deseja imprimir</h2>
      {error && <Alert tone="error">{error}</Alert>}
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
              min={printFrom}
              disabled={printRangeMode === 'day'}
              onChange={(event) => onUntilChange(event.target.value)}
            />
          </label>
        </div>
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
        <small className={styles.helper}>
          {printRangeMode === 'day'
            ? 'Serão consideradas apenas encomendas entre estes horários.'
            : 'A hora inicial aplica-se ao primeiro dia e a hora final ao último dia.'}
        </small>
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
        <Button
          variant="primary"
          disabled={!orderCount || isPreparing || !hasValidDateTimeRange || Boolean(error)}
          onClick={onConfirm}
        >
          {isPreparing ? 'A preparar...' : 'Imprimir'}
        </Button>
      </div>
    </Dialog>
  );
}
