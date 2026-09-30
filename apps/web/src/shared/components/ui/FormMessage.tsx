import type { HTMLAttributes } from 'react';

import styles from './FormMessage.module.css';

export type FormMessageProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'error' | 'hint' | 'success';
};

export function FormMessage({ className, tone = 'hint', ...props }: FormMessageProps) {
  return (
    <span
      className={[styles.message, styles[tone], className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
