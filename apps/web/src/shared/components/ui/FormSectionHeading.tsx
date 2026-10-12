import type { ReactNode } from 'react';
import styles from './FormSectionHeading.module.css';

export function FormSectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className={styles.heading} data-eyebrow>
      {children}
    </h3>
  );
}
