import { Button, Card } from '../../../shared/components/ui';
import type { RecoveryArchive } from '../../../shared/lib/recoveryArchive';
import styles from './RecoveryPanel.module.css';

type RecoveryPanelProps = {
  archive: RecoveryArchive | null;
  isPreparing: boolean;
  onDownload: () => void;
};

function formatTimestamp(value?: string) {
  if (!value) return 'Ainda não criada';
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function RecoveryPanel({ archive, isPreparing, onDownload }: RecoveryPanelProps) {
  return (
    <Card as="section" className={styles.panel}>
      <div className={styles.copy}>
        <div>
          <span data-eyebrow>Proteção de dados</span>
          <h2>Arquivo de recuperação</h2>
        </div>
        <p>
          As alterações ficam registadas automaticamente neste dispositivo. Transfira periodicamente
          o ficheiro completo e guarde-o num local privado fora deste equipamento. O site nunca usa
          este arquivo para substituir dados do Supabase sem revisão.
        </p>
        <div className={styles.status} aria-live="polite">
          <span>{archive?.events.length ?? 0} alterações locais registadas</span>
          <span>Última alteração: {formatTimestamp(archive?.updatedAt)}</span>
          <span>Cópia automática: {formatTimestamp(archive?.latestOperationalSnapshotAt)}</span>
          <span>Último snapshot: {formatTimestamp(archive?.latestServerSnapshotAt)}</span>
        </div>
      </div>
      <Button
        className={styles.action}
        variant="primary"
        disabled={isPreparing}
        onClick={onDownload}
      >
        {isPreparing ? 'A preparar arquivo...' : 'Transferir arquivo completo'}
      </Button>
    </Card>
  );
}
