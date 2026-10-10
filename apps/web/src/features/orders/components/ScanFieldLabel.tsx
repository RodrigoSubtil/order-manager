import type { ScanReviewStatus } from '../hooks/useScanReview';
import styles from './ScanFieldLabel.module.css';

type Props = { htmlFor: string; children: React.ReactNode; status?: ScanReviewStatus };

const states = {
  conferir: { label: 'Conferir', icon: '!', className: styles.check },
  provavel: { label: 'Provável', icon: '!', className: styles.likely },
  conferido: { label: 'Conferido', icon: '✓', className: styles.reviewed },
};

export function ScanFieldLabel({ htmlFor, children, status }: Props) {
  if (!status) return <label htmlFor={htmlFor}>{children}</label>;
  const state = states[status];

  return (
    <div className={styles.row}>
      <label htmlFor={htmlFor}>{children}</label>
      <span className={`${styles.badge} ${state.className}`} aria-live="polite">
        <span aria-hidden="true">{state.icon}</span>
        {state.label}
      </span>
    </div>
  );
}
