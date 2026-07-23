import { forwardRef, type ButtonHTMLAttributes } from 'react';

import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconOnly?: boolean;
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, iconOnly = false, type = 'button', variant = 'secondary', ...props },
  ref,
) {
  const classes = [styles.button, styles[variant], iconOnly && styles.icon, className]
    .filter(Boolean)
    .join(' ');

  return <button ref={ref} className={classes} type={type} {...props} />;
});
