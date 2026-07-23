import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';

import styles from './Dialog.module.css';

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export type DialogProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  children: ReactNode;
  onClose: () => void;
  size?: 'large' | 'small';
  titleId: string;
};

export function Dialog({
  children,
  className,
  onClose,
  size = 'small',
  titleId,
  ...props
}: DialogProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const preferredFocus = panel?.querySelector<HTMLElement>('[data-autofocus]');
    const firstFocus = panel?.querySelector<HTMLElement>(focusableSelector);
    (preferredFocus ?? firstFocus ?? panel)?.focus();

    return () => previousFocus?.focus();
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    if (focusable.length === 0) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className={styles.backdrop} data-dialog-backdrop data-screen-only>
      <section
        {...props}
        ref={panelRef}
        className={[styles.panel, size === 'large' && styles.large, className]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </section>
    </div>
  );
}
