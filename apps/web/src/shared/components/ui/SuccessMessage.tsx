import { useEffect, useRef } from 'react';

import { Button } from './Button';
import { DialogActions } from './DialogActions';
import styles from './SuccessMessage.module.css';

type SuccessMessageProps = {
  actionLabel: string;
  onAction: () => void;
  title: string;
  subject?: string;
  detail?: string;
  titleId?: string;
};

export function SuccessMessage({
  actionLabel,
  onAction,
  title,
  subject,
  detail,
  titleId,
}: SuccessMessageProps) {
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    actionRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={styles.content}>
      <div className={styles.summary} role="status" aria-live="polite">
        <h3 id={titleId}>
          <span className={subject ? styles.context : undefined}>{title}</span>
          {subject && (
            <>
              {' '}
              <strong className={styles.subject}>{subject}</strong>
            </>
          )}
          {detail && (
            <>
              {' '}
              <span className={styles.detail}>{detail}</span>
            </>
          )}
        </h3>
      </div>
      <DialogActions className={styles.singleAction}>
        <Button ref={actionRef} data-autofocus variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      </DialogActions>
    </div>
  );
}
