import type { HTMLAttributes } from 'react';

import styles from './DialogActions.module.css';

export function DialogActions({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <footer className={[styles.actions, className].filter(Boolean).join(' ')} {...props} />;
}
