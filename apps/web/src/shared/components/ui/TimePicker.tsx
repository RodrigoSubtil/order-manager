import { useEffect, useId, useRef, useState } from 'react';

import styles from './TimePicker.module.css';

type TimePickerProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  minTime?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
};

type WheelKind = 'hour' | 'minute';

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const wheelItemHeight = 44;

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? { hour: match[1], minute: match[2] } : null;
}

function useMobileTimePicker() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 560px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 560px)');
    if (!media) return;

    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

export function TimePicker({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  className,
  disabled = false,
  id,
  minTime,
  onChange,
  placeholder = 'Selecionar hora',
  required = false,
  value,
}: TimePickerProps) {
  const generatedId = useId();
  const controlId = id ?? `time-picker-${generatedId}`;
  const isMobile = useMobileTimePicker();
  const hourWheelRef = useRef<HTMLDivElement>(null);
  const minuteWheelRef = useRef<HTMLDivElement>(null);
  const scrollTimers = useRef<Partial<Record<WheelKind, ReturnType<typeof setTimeout>>>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [draftHour, setDraftHour] = useState('08');
  const [draftMinute, setDraftMinute] = useState('00');
  const draftTime = `${draftHour}:${draftMinute}`;
  const isBeforeMinimum = Boolean(minTime && draftTime < minTime);

  useEffect(
    () => () => {
      Object.values(scrollTimers.current).forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const hourIndex = hours.indexOf(draftHour);
    const minuteIndex = minutes.indexOf(draftMinute);
    if (hourWheelRef.current) hourWheelRef.current.scrollTop = hourIndex * wheelItemHeight;
    if (minuteWheelRef.current) minuteWheelRef.current.scrollTop = minuteIndex * wheelItemHeight;
  }, [draftHour, draftMinute, isOpen]);

  function openPicker() {
    const selectedTime = parseTime(value);
    const minimumTime = parseTime(minTime ?? '');
    setDraftHour(selectedTime?.hour ?? minimumTime?.hour ?? '08');
    setDraftMinute(selectedTime?.minute ?? minimumTime?.minute ?? '00');
    setIsOpen(true);
  }

  function updateFromScroll(kind: WheelKind, element: HTMLDivElement) {
    const values = kind === 'hour' ? hours : minutes;
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(element.scrollTop / wheelItemHeight)),
    );
    clearTimeout(scrollTimers.current[kind]);
    scrollTimers.current[kind] = setTimeout(() => {
      if (kind === 'hour') setDraftHour(values[index]);
      else setDraftMinute(values[index]);
    }, 80);
  }

  function selectWheelValue(kind: WheelKind, selectedValue: string) {
    const values = kind === 'hour' ? hours : minutes;
    const wheel = kind === 'hour' ? hourWheelRef.current : minuteWheelRef.current;
    if (kind === 'hour') setDraftHour(selectedValue);
    else setDraftMinute(selectedValue);
    if (wheel) wheel.scrollTop = values.indexOf(selectedValue) * wheelItemHeight;
  }

  if (!isMobile) {
    return (
      <input
        id={controlId}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className={[styles.nativeInput, className].filter(Boolean).join(' ')}
        disabled={disabled}
        min={minTime}
        required={required}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
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
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
      >
        <span className={value ? styles.value : styles.placeholder}>{value || placeholder}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.backdrop} role="presentation" onMouseDown={() => setIsOpen(false)}>
          <div
            className={styles.picker}
            role="dialog"
            aria-label="Escolher hora"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <strong>Deslize para escolher a hora</strong>

            <div className={styles.wheelGroup}>
              <div
                ref={hourWheelRef}
                className={styles.wheel}
                role="listbox"
                aria-label="Horas"
                onScroll={(event) => updateFromScroll('hour', event.currentTarget)}
              >
                {hours.map((hour) => (
                  <button
                    key={hour}
                    className={draftHour === hour ? styles.selectedWheelItem : undefined}
                    role="option"
                    aria-selected={draftHour === hour}
                    type="button"
                    onClick={() => selectWheelValue('hour', hour)}
                  >
                    {hour}
                  </button>
                ))}
              </div>

              <span className={styles.separator} aria-hidden="true">
                :
              </span>

              <div
                ref={minuteWheelRef}
                className={styles.wheel}
                role="listbox"
                aria-label="Minutos"
                onScroll={(event) => updateFromScroll('minute', event.currentTarget)}
              >
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    className={draftMinute === minute ? styles.selectedWheelItem : undefined}
                    role="option"
                    aria-selected={draftMinute === minute}
                    type="button"
                    onClick={() => selectWheelValue('minute', minute)}
                  >
                    {minute}
                  </button>
                ))}
              </div>
              <div className={styles.selectionBand} aria-hidden="true" />
            </div>

            {isBeforeMinimum && (
              <span className={styles.error} role="alert">
                Para hoje, escolha {minTime} ou uma hora posterior.
              </span>
            )}

            <footer className={styles.actions}>
              <button type="button" onClick={() => setIsOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={isBeforeMinimum}
                onClick={() => {
                  if (isBeforeMinimum) return;
                  onChange(draftTime);
                  setIsOpen(false);
                }}
              >
                Confirmar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
