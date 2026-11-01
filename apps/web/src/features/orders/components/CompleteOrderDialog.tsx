import { Button, Dialog, DialogActions, DialogHeader } from '../../../shared/components/ui';
import type { Order } from '../../../shared/lib/domain';
import styles from '../../../shared/components/ui/ConfirmationDialog.module.css';

type CompleteOrderDialogProps = {
  isSaving: boolean;
  order: Order;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CompleteOrderDialog({
  isSaving,
  order,
  onCancel,
  onConfirm,
}: CompleteOrderDialogProps) {
  return (
    <Dialog className={styles.content} titleId="complete-order-title" onClose={onCancel}>
      <DialogHeader title="Concluir encomenda?" titleId="complete-order-title" />
      <div className={styles.body}>
        <p>Confirma a conclusão da encomenda?</p>
        <div className={styles.details}>
          <span>Cliente: {order.clientName}</span>
        </div>
      </div>
      <DialogActions>
        <Button data-autofocus variant="danger-subtle" disabled={isSaving} onClick={onCancel}>
          Não
        </Button>
        <Button
          className={styles.completeButton}
          variant="success"
          aria-label={isSaving ? 'A concluir encomenda' : 'Concluir encomenda'}
          title={isSaving ? 'A concluir encomenda' : 'Concluir encomenda'}
          disabled={isSaving}
          onClick={onConfirm}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m5 12 4 4L19 6" />
          </svg>
        </Button>
      </DialogActions>
    </Dialog>
  );
}
