import { Button, Icon } from '../../../shared/components/ui';
import { formatPickupDelay } from '../lib/overduePickups';
import styles from './OverduePickupNotice.module.css';

type NoticeProps = {
  count: number;
  active: boolean;
  onToggle: () => void;
};

export function OverduePickupNotice({ count, active, onToggle }: NoticeProps) {
  if (!count && !active) return null;
  const title = count
    ? `${count} ${count === 1 ? 'recolha atrasada' : 'recolhas atrasadas'}`
    : 'Sem recolhas atrasadas';
  return (
    <section
      className={`${styles.notice} ${count ? '' : styles.clear}`}
      aria-label="Aviso de recolhas atrasadas"
    >
      <Icon name="clock" className={styles.noticeIcon} />
      <strong className={styles.copy} role="status">
        {title}
      </strong>
      <Button
        variant="ghost"
        className={styles.toggle}
        onClick={onToggle}
        aria-pressed={active}
        aria-label={active ? 'Voltar aos filtros' : 'Ver recolhas atrasadas'}
      >
        {active ? 'Voltar' : 'Ver'}
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
