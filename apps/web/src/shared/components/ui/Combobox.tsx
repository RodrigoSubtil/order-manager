import {
  createContext,
  forwardRef,
  useEffect,
  useContext,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import { Input } from './Input';
import { Icon } from './Icon';
import styles from './Combobox.module.css';

type ComboboxContextValue = {
  closeAndBlur: () => void;
  inputId: string;
  isOpen: boolean;
  listId: string;
  onOpenChange: (open: boolean) => void;
};

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

function useComboboxContext() {
  const context = useContext(ComboboxContext);
  if (!context) throw new Error('Combobox components must be used inside Combobox.');
  return context;
}

export type ComboboxProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  id: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function Combobox({
  children,
  className,
  id,
  isOpen,
  onOpenChange,
  onKeyDown,
  ...props
}: ComboboxProps) {
  const listId = `${id}-listbox`;
  const root = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChangeRef.current(false);
    };

    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      onOpenChange(false);
      event.currentTarget.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus();
    }
    if (event.key === 'ArrowDown' && isOpen) {
      const firstOption = event.currentTarget.querySelector<HTMLElement>('[role="option"]');
      if (firstOption) {
        event.preventDefault();
        firstOption.focus();
      }
    }
  }

  function closeAndBlur() {
    onOpenChange(false);
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && root.current?.contains(activeElement)) {
      activeElement.blur();
    }
  }

  return (
    <ComboboxContext.Provider value={{ closeAndBlur, inputId: id, isOpen, listId, onOpenChange }}>
      <div
        {...props}
        ref={root}
        data-combobox
        className={[styles.root, className].filter(Boolean).join(' ')}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </ComboboxContext.Provider>
  );
}

export const ComboboxInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function ComboboxInput({ className, id, onClick, ...props }, ref) {
    const context = useComboboxContext();
    return (
      <Input
        {...props}
        ref={ref}
        id={id ?? context.inputId}
        className={[styles.input, className].filter(Boolean).join(' ')}
        role="combobox"
        aria-autocomplete={props.readOnly ? 'none' : 'list'}
        aria-controls={context.listId}
        aria-expanded={context.isOpen}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            if (context.isOpen) context.closeAndBlur();
            else context.onOpenChange(true);
          }
        }}
      />
    );
  },
);

export function ComboboxTrigger({
  children,
  className,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useComboboxContext();
  return (
    <button
      {...props}
      className={[styles.trigger, className].filter(Boolean).join(' ')}
      type="button"
      aria-controls={context.listId}
      aria-expanded={context.isOpen}
      aria-haspopup="listbox"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          if (context.isOpen) context.closeAndBlur();
          else context.onOpenChange(true);
        }
      }}
    >
      {children ?? <Icon name="chevron-down" />}
    </button>
  );
}

export function ComboboxList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const context = useComboboxContext();
  if (!context.isOpen) return null;
  return (
    <div
      {...props}
      id={context.listId}
      className={[styles.list, className].filter(Boolean).join(' ')}
      role="listbox"
    />
  );
}

export function ComboboxOption({
  className,
  onClick,
  onKeyDown,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useComboboxContext();
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
      return;
    const options = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    const currentIndex = options.indexOf(event.currentTarget);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : event.key === 'ArrowDown'
            ? Math.min(currentIndex + 1, options.length - 1)
            : Math.max(currentIndex - 1, 0);
    event.preventDefault();
    options[nextIndex]?.focus();
  }

  return (
    <button
      {...props}
      className={[styles.option, className].filter(Boolean).join(' ')}
      type="button"
      role="option"
      tabIndex={-1}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.closeAndBlur();
      }}
      onKeyDown={handleKeyDown}
    />
  );
}

export function ComboboxEmpty({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={[styles.empty, className].filter(Boolean).join(' ')} />;
}
