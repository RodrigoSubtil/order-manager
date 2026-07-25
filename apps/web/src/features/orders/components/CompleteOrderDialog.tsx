import { Button, Dialog } from '../../../shared/components/ui';
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
      <h2 id="complete-order-title">Concluir encomenda?</h2>
      <p>Confirme se o pedido já foi entregue ou finalizado.</p>
      <div className={styles.details}>
        <span>Pedido #{order.orderNumber ?? '-'}</span>
      </div>
      <div className={styles.actions}>
        <Button data-autofocus disabled={isSaving} onClick={onCancel}>
          Não
        </Button>
        <Button variant="primary" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? 'A concluir...' : 'Sim, concluir'}
        </Button>
      </div>
    </Dialog>
  );
}
