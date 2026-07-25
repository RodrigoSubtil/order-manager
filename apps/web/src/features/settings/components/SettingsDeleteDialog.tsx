import { Button, Dialog } from '../../../shared/components/ui';
import styles from '../../../shared/components/ui/ConfirmationDialog.module.css';

type SettingsDeleteDialogProps = {
  isSaving: boolean;
  itemName: string;
  itemType: 'produto' | 'responsável';
  onCancel: () => void;
  onConfirm: () => void;
};

export function SettingsDeleteDialog({
  isSaving,
  itemName,
  itemType,
  onCancel,
  onConfirm,
}: SettingsDeleteDialogProps) {
  return (
    <Dialog className={styles.content} titleId="settings-delete-title" onClose={onCancel}>
      <h2 id="settings-delete-title">Apagar {itemType}?</h2>
      <p>Esta ação não poderá ser anulada.</p>
      <div className={styles.details}>
        <span>{itemName}</span>
      </div>
      <div className={styles.actions}>
        <Button data-autofocus disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? 'A apagar...' : 'Apagar'}
        </Button>
      </div>
    </Dialog>
  );
}
