import { Button, Dialog } from '../../../shared/components/ui';
import type { Order } from '../../../shared/lib/domain';
import styles from './ConfirmationDialog.module.css';

type DeleteOrderDialogProps = {
  isSaving: boolean;
  order: Order;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteOrderDialog({
  isSaving,
  order,
  onCancel,
  onConfirm,
}: DeleteOrderDialogProps) {
  return (
    <Dialog className={styles.content} titleId="delete-title" onClose={onCancel}>
      <h2 id="delete-title">Apagar encomenda?</h2>
      <p>Esta ação não pode ser anulada.</p>
      <div className={styles.details}>
        <span>Pedido #{order.orderNumber ?? '-'}</span>
      </div>
      <div className={styles.actions}>
        <Button data-autofocus disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className={styles.deleteButton}
          variant="danger"
          aria-label={isSaving ? 'A apagar encomenda' : 'Apagar encomenda'}
          title={isSaving ? 'A apagar encomenda' : 'Apagar encomenda'}
          disabled={isSaving}
          onClick={onConfirm}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" />
          </svg>
        </Button>
      </div>
    </Dialog>
  );
}
