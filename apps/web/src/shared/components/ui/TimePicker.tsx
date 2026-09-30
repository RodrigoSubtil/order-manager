import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button } from './Button';
import { Icon } from './Icon';
import styles from './TimePicker.module.css';

type TimePickerProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  minTime?: string;
  maxTime?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
};

type WheelKind = 'hour' | 'minute';

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const minutes = ['00', '30'];
const wheelItemHeight = 44;

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? { hour: match[1], minute: match[2] } : null;
}

function nextHalfHour(value: string) {
  const parsed = parseTime(value);
  if (!parsed) return undefined;
  const hour = Number(parsed.hour);
  const minute = Number(parsed.minute);
  if (minute === 0 || minute === 30) return value;
  const nextMinutes = minute < 30 ? hour * 60 + 30 : (hour + 1) * 60;
  return `${String(Math.floor(nextMinutes / 60)).padStart(2, '0')}:${String(nextMinutes % 60).padStart(2, '0')}`;
}

function getAvailableMinutes(hour: string, minTime?: string, maxTime?: string) {
  return minutes.filter((minute) => {
    const time = `${hour}:${minute}`;
    return (!minTime || time >= minTime) && (!maxTime || time <= maxTime);
  });
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
  maxTime,
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
  const firstAvailableTime = nextHalfHour(minTime ?? '');
  const availableHours = useMemo(
    () => hours.filter((hour) => getAvailableMinutes(hour, firstAvailableTime, maxTime).length > 0),
    [firstAvailableTime, maxTime],
  );
  const visibleMinutes = useMemo(
    () => getAvailableMinutes(draftHour, firstAvailableTime, maxTime),
    [draftHour, firstAvailableTime, maxTime],
  );
  const hasAvailableTime = availableHours.length > 0;
  const isBeforeMinimum = Boolean(firstAvailableTime && draftTime < firstAvailableTime);
  const isAfterMaximum = Boolean(maxTime && draftTime > maxTime);

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

    const hourIndex = availableHours.indexOf(draftHour);
    const minuteIndex = visibleMinutes.indexOf(draftMinute);
    if (hourWheelRef.current) hourWheelRef.current.scrollTop = hourIndex * wheelItemHeight;
    if (minuteWheelRef.current) minuteWheelRef.current.scrollTop = minuteIndex * wheelItemHeight;
  }, [availableHours, draftHour, draftMinute, isOpen, visibleMinutes]);

  function openPicker() {
    const roundedValue = nextHalfHour(value);
    const initialTime =
      roundedValue &&
      (!firstAvailableTime || roundedValue >= firstAvailableTime) &&
      (!maxTime || roundedValue <= maxTime)
        ? roundedValue
        : availableHours.length
          ? `${availableHours[0]}:${getAvailableMinutes(availableHours[0], firstAvailableTime, maxTime)[0]}`
          : '08:00';
    const parsedTime = parseTime(initialTime);
    setDraftHour(parsedTime?.hour ?? '08');
    setDraftMinute(parsedTime?.minute ?? '00');
    setIsOpen(true);
  }

  function updateFromScroll(kind: WheelKind, element: HTMLDivElement) {
    const values = kind === 'hour' ? availableHours : visibleMinutes;
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(element.scrollTop / wheelItemHeight)),
    );
    clearTimeout(scrollTimers.current[kind]);
    scrollTimers.current[kind] = setTimeout(() => {
      if (kind === 'hour') {
        setDraftHour(values[index]);
        setDraftMinute((currentMinute) =>
          getAvailableMinutes(values[index], firstAvailableTime, maxTime).includes(currentMinute)
            ? currentMinute
            : getAvailableMinutes(values[index], firstAvailableTime, maxTime)[0],
        );
      } else setDraftMinute(values[index]);
    }, 80);
  }

  function selectWheelValue(kind: WheelKind, selectedValue: string) {
    const values = kind === 'hour' ? availableHours : visibleMinutes;
    const wheel = kind === 'hour' ? hourWheelRef.current : minuteWheelRef.current;
    if (kind === 'hour') {
      setDraftHour(selectedValue);
      setDraftMinute((currentMinute) =>
        getAvailableMinutes(selectedValue, firstAvailableTime, maxTime).includes(currentMinute)
          ? currentMinute
          : getAvailableMinutes(selectedValue, firstAvailableTime, maxTime)[0],
      );
    } else setDraftMinute(selectedValue);
    if (wheel) wheel.scrollTop = values.indexOf(selectedValue) * wheelItemHeight;
  }

  if (!isMobile) {
    return (
      <div className={[styles.nativeRoot, className].filter(Boolean).join(' ')}>
        <input
          id={controlId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          className={styles.nativeInput}
          disabled={disabled}
          min={firstAvailableTime}
          max={maxTime}
          step={1800}
          required={required}
          type="time"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Icon name="clock" placement="field" />
      </div>
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
        <Icon name="clock" placement="field" />
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

            {hasAvailableTime ? (
              <div className={styles.wheelGroup}>
                <div
                  ref={hourWheelRef}
                  className={styles.wheel}
                  role="listbox"
                  aria-label="Horas"
                  onScroll={(event) => updateFromScroll('hour', event.currentTarget)}
                >
                  {availableHours.map((hour) => (
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
                  {visibleMinutes.map((minute) => (
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
            ) : (
              <span className={styles.error} role="alert">
                Não há horários disponíveis para esta data. Escolha outra data.
              </span>
            )}

            {hasAvailableTime && isBeforeMinimum && (
              <span className={styles.error} role="alert">
                Para hoje, escolha {firstAvailableTime} ou uma hora posterior.
              </span>
            )}
            {hasAvailableTime && isAfterMaximum && (
              <span className={styles.error} role="alert">
                Escolha {maxTime} ou uma hora anterior.
              </span>
            )}

            <footer className={styles.actions}>
              <Button onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button
                variant="primary"
                disabled={!hasAvailableTime || isBeforeMinimum || isAfterMaximum}
                onClick={() => {
                  if (isBeforeMinimum || isAfterMaximum) return;
                  onChange(draftTime);
                  setIsOpen(false);
                }}
              >
                Confirmar
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
