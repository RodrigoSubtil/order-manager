import { Button, Dialog } from '../../../shared/components/ui';
import styles from './LogoutConfirmDialog.module.css';

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
      <span data-eyebrow>Confirmar saída</span>
      <h2 id="logout-title">Deseja realmente sair?</h2>
      <p>Ao sair, será necessário iniciar sessão novamente para voltar ao painel.</p>
      <div className={styles.details}>
        <span>Utilizador: {companyDisplayName}</span>
      </div>
      <div className={styles.actions}>
        <Button data-autofocus variant="secondary" disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? 'A sair...' : 'Sair'}
        </Button>
      </div>
    </Dialog>
  );
}
