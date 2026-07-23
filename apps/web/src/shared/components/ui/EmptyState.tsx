import type { HTMLAttributes, ReactNode } from 'react';

import styles from './EmptyState.module.css';

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  description?: ReactNode;
  title: ReactNode;
};

export function EmptyState({ className, description, title, ...props }: EmptyStateProps) {
  return (
    <div className={[styles.emptyState, className].filter(Boolean).join(' ')} {...props}>
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}
