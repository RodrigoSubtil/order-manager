import type { ScanStatus } from '../schemas/scanDraft';
import styles from './ScanFieldLabel.module.css';

type Props = { htmlFor: string; children: React.ReactNode; status?: ScanStatus };

export function ScanFieldLabel({ htmlFor, children, status }: Props) {
  if (!status) return <label htmlFor={htmlFor}>{children}</label>;

  return (
    <div className={styles.row}>
      <label htmlFor={htmlFor}>{children}</label>
      <span className={`${styles.badge} ${status === 'conferir' ? styles.check : styles.likely}`}>
        <span aria-hidden="true">{status === 'conferir' ? '!' : '✓'}</span>
        {status === 'conferir' ? 'Conferir' : 'Provável'}
      </span>
    </div>
  );
}
