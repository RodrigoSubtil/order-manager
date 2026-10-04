import { forwardRef, type SelectHTMLAttributes } from 'react';

import { Icon } from './Icon';
import styles from './Select.module.css';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, onChange, ...props },
  ref,
) {
  return (
    <span className={styles.root}>
      <select
        ref={ref}
        className={[styles.select, className].filter(Boolean).join(' ')}
        {...props}
        onChange={(event) => {
          onChange?.(event);
          event.currentTarget.blur();
        }}
      />
      <Icon name="chevron-down" placement="field" />
    </span>
  );
});
