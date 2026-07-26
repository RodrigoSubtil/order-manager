import { Button } from './Button';
import styles from './SuccessMessage.module.css';

type SuccessMessageProps = {
  actionLabel: string;
  onAction: () => void;
  title: string;
  titleId?: string;
};

export function SuccessMessage({ actionLabel, onAction, title, titleId }: SuccessMessageProps) {
  return (
    <div className={styles.content} role="status" aria-live="polite">
      <div className={styles.icon} aria-hidden="true">
        ✓
      </div>
      <h3 id={titleId}>{title}</h3>
      <Button data-autofocus variant="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
