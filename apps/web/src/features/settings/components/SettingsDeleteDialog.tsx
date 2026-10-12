import { Button, Dialog, DialogActions, DialogHeader } from '../../../shared/components/ui';
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
      <DialogHeader
        title={`Apagar ${itemType}?`}
        titleId="settings-delete-title"
        onClose={onCancel}
      />
      <div className={styles.body}>
        <p>Esta ação não poderá ser anulada.</p>
        <div className={styles.details}>
          <span>{itemName}</span>
        </div>
      </div>
      <DialogActions>
        <Button data-autofocus variant="danger-subtle" disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? 'A apagar...' : 'Apagar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
