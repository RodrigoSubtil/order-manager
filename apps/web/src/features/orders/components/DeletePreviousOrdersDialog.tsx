import { Button, Dialog, Input } from '../../../shared/components/ui';
import styles from './ConfirmationDialog.module.css';

type DeletePreviousOrdersDialogProps = {
  count: number;
  from: string;
  isPreviewed: boolean;
  isSaving: boolean;
  until: string;
  onCancel: () => void;
  onConfirm: () => void;
  onFromChange: (value: string) => void;
  onUntilChange: (value: string) => void;
};

export function DeletePreviousOrdersDialog({
  count,
  from,
  isPreviewed,
  isSaving,
  until,
  onCancel,
  onConfirm,
  onFromChange,
  onUntilChange,
}: DeletePreviousOrdersDialogProps) {
  return (
    <Dialog className={styles.content} titleId="delete-previous-title" onClose={onCancel}>
      <span data-eyebrow>Limpar anteriores</span>
      <h2 id="delete-previous-title">Excluir todas as encomendas anteriores?</h2>
      <p>
        Escolha o período que deve ser limpo. Se deixar o início vazio, apaga desde a primeira
        encomenda até à data final.
      </p>
      <div className={styles.dateGrid}>
        <label className={styles.dateField} htmlFor="delete-orders-from">
          De
          <Input
            id="delete-orders-from"
            type="date"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
        </label>
        <label className={styles.dateField} htmlFor="delete-orders-until">
          Até
          <Input
            id="delete-orders-until"
            required
            type="date"
            value={until}
            onChange={(event) => onUntilChange(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.details} aria-live="polite">
        <span>
          {isPreviewed
            ? `${count} ${count === 1 ? 'encomenda será apagada' : 'encomendas serão apagadas'}`
            : 'Confirme para consultar a pré-visualização segura na API.'}
        </span>
      </div>
      <div className={styles.actions}>
        <Button data-autofocus disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? 'A excluir...' : isPreviewed ? 'Confirmar exclusão' : 'Ver pré-visualização'}
        </Button>
      </div>
    </Dialog>
  );
}
