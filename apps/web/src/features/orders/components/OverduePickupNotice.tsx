import { Button, Icon } from '../../../shared/components/ui';
import { formatPickupDelay } from '../lib/overduePickups';
import styles from './OverduePickupNotice.module.css';

type NoticeProps = {
  count: number;
  oldestMinutes: number | null;
  active: boolean;
  onToggle: () => void;
};

export function OverduePickupNotice({ count, oldestMinutes, active, onToggle }: NoticeProps) {
  if (!count && !active) return null;
  const title = count
    ? `${count} ${count === 1 ? 'recolha atrasada' : 'recolhas atrasadas'}`
    : 'Sem recolhas atrasadas';
  return (
    <section className={styles.notice} aria-label="Aviso de recolhas atrasadas">
      <Icon name="clock" className={styles.noticeIcon} />
      <div className={styles.copy}>
        <strong role="status">{title}</strong>
        <span>
          {oldestMinutes === null
            ? 'Todas as recolhas pendentes estão dentro do horário.'
            : `A mais antiga: há ${formatPickupDelay(oldestMinutes)}`}
        </span>
      </div>
      <Button variant="ghost" className={styles.toggle} onClick={onToggle} aria-pressed={active}>
        {active ? 'Voltar aos filtros' : 'Ver atrasadas'}
      </Button>
    </section>
  );
}

export function OverduePickupBadge({ minutes }: { minutes: number }) {
  return (
    <div className={styles.badge} aria-live="off">
      <Icon name="clock" className={styles.badgeIcon} />
      <span>Recolha atrasada · há {formatPickupDelay(minutes)}</span>
    </div>
  );
}
