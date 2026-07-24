import type { HTMLAttributes } from 'react';

import styles from './Alert.module.css';

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'error' | 'info' | 'success';
};

export function Alert({ className, role = 'alert', tone = 'info', ...props }: AlertProps) {
  return (
    <div
      className={[styles.alert, styles[tone], className].filter(Boolean).join(' ')}
      role={role}
      {...props}
    />
  );
}
