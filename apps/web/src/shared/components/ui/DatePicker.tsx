import { useEffect, useId, useMemo, useRef, useState } from 'react';

import styles from './DatePicker.module.css';

type DatePickerProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
  withClearAction?: boolean;
};

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day, 12);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSelectedDate(value: string) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(date);
}

function getCalendarDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 12);
  const startsOn = (firstDay.getDay() + 6) % 7;
  const firstVisibleDay = new Date(firstDay);
  firstVisibleDay.setDate(firstDay.getDate() - startsOn);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisibleDay);
    day.setDate(firstVisibleDay.getDate() + index);
    return day;
  });
}

export function DatePicker({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  className,
  disabled = false,
  id,
  onChange,
  placeholder = 'Selecionar data',
  required = false,
  value,
  withClearAction = false,
}: DatePickerProps) {
  const generatedId = useId();
  const controlId = id ?? `date-picker-${generatedId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : '';
  const todayDateKey = toDateKey(new Date());
  const monthTitle = new Intl.DateTimeFormat('pt-PT', {
    month: 'long',
    year: 'numeric',
  }).format(viewDate);

  useEffect(() => {
    const nextSelectedDate = parseDate(value);
    if (nextSelectedDate) setViewDate(nextSelectedDate);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function changeMonth(offset: number) {
    setViewDate(
      (currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1, 12),
    );
  }

  function selectDate(date: Date) {
    onChange(toDateKey(date));
    setIsOpen(false);
  }

  function clearDate() {
    onChange('');
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')}>
      <button
        id={controlId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-required={required}
        className={styles.control}
        disabled={disabled}
        type="button"
        onClick={() => {
          if (!isOpen && selectedDate) setViewDate(selectedDate);
          setIsOpen((open) => !open);
        }}
      >
        <span className={value ? styles.value : styles.placeholder}>
          {formatSelectedDate(value) || placeholder}
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M7 3v3M17 3v3M4.5 9.5h15M5.5 5h13a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.calendar} role="dialog" aria-label="Escolher data">
          <header className={styles.header}>
            <button type="button" aria-label="Mês anterior" onClick={() => changeMonth(-1)}>
              ‹
            </button>
            <strong>{monthTitle}</strong>
            <button type="button" aria-label="Próximo mês" onClick={() => changeMonth(1)}>
              ›
            </button>
          </header>

          <div className={styles.weekDays} aria-hidden="true">
            {weekDays.map((weekDay) => (
              <span key={weekDay}>{weekDay}</span>
            ))}
          </div>

          <div className={styles.days}>
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = dateKey === selectedDateKey;
              const isToday = dateKey === todayDateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  aria-label={formatDayLabel(date)}
                  aria-pressed={isSelected}
                  className={[
                    styles.day,
                    !isCurrentMonth && styles.outsideMonth,
                    isSelected && styles.selected,
                    isToday && styles.today,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <footer className={styles.footer}>
            {withClearAction && (
              <button type="button" className={styles.clear} onClick={clearDate}>
                Limpar data
              </button>
            )}
            <button
              type="button"
              className={styles.todayAction}
              onClick={() => selectDate(new Date())}
            >
              Hoje
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
