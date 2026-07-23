import { Button, Dialog } from '../../../shared/components/ui';
import { formatDate } from '../../../shared/lib/dateUtils';
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
      <span data-eyebrow>Confirmar exclusão</span>
      <h2 id="delete-title">Apagar esta encomenda?</h2>
      <p>
        Esta ação vai remover a encomenda de <strong>{order.clientName}</strong>.
      </p>
      <div className={styles.details}>
        <span>Pedido #{order.orderNumber ?? '-'}</span>
        <span>{formatDate(order.deliveryDate)}</span>
        <span>{order.deliveryTime || 'Sem hora marcada'}</span>
        <span>{order.phone || 'Sem telefone'}</span>
      </div>
      <div className={styles.actions}>
        <Button data-autofocus disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? 'A apagar...' : 'Apagar encomenda'}
        </Button>
      </div>
    </Dialog>
  );
}
