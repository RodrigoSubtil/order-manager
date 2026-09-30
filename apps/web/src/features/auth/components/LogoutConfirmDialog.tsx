import { Button, Dialog, DialogActions, DialogHeader } from '../../../shared/components/ui';
import styles from '../../../shared/components/ui/ConfirmationDialog.module.css';

type LogoutConfirmDialogProps = {
  companyDisplayName: string;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LogoutConfirmDialog({
  companyDisplayName,
  isSaving,
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  return (
    <Dialog className={styles.content} titleId="logout-title" onClose={onCancel}>
      <DialogHeader title="Confirmar saída" titleId="logout-title" onClose={onCancel} />
      <div className={styles.body}>
        <p>Ao sair, será necessário iniciar sessão novamente para voltar ao painel.</p>
        <div className={styles.details}>
          <span>Utilizador: {companyDisplayName}</span>
        </div>
      </div>
      <DialogActions>
        <Button data-autofocus variant="secondary" disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? 'A sair...' : 'Sair'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
