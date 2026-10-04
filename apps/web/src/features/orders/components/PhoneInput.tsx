import { forwardRef, useLayoutEffect, useRef, type InputHTMLAttributes } from 'react';

import { Input } from '../../../shared/components/ui';
import { digitsOnly, formatNationalPhone } from '../lib/phoneNumber';

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  countryCode: string;
  onValueChange: (digits: string) => void;
  value: string;
};

function caretAfterDigits(formatted: string, count: number) {
  if (count <= 0) return 0;
  if (count >= digitsOnly(formatted).length) return formatted.length;

  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) seen += 1;
    if (seen === count) return index + 1;
  }
  return formatted.length;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { countryCode, onKeyDown, onValueChange, value, ...props },
  forwardedRef,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const formatted = formatNationalPhone(countryCode, value);

  useLayoutEffect(() => {
    if (pendingCaret.current === null || document.activeElement !== inputRef.current) return;
    const position = caretAfterDigits(formatted, pendingCaret.current);
    inputRef.current?.setSelectionRange(position, position);
    pendingCaret.current = null;
  }, [formatted]);

  function deleteDigit(direction: 'backward' | 'forward', position: number) {
    const digitsBeforeCaret = digitsOnly(formatted.slice(0, position)).length;
    const index = direction === 'backward' ? digitsBeforeCaret - 1 : digitsBeforeCaret;
    if (index < 0 || index >= value.length) return;
    pendingCaret.current = index;
    onValueChange(value.slice(0, index) + value.slice(index + 1));
  }

  return (
    <Input
      {...props}
      ref={(node) => {
        inputRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      inputMode="numeric"
      value={formatted}
      onChange={(event) => {
        const entered = event.currentTarget.value;
        const inputType = (event.nativeEvent as InputEvent).inputType;
        const caret = event.currentTarget.selectionStart ?? entered.length;
        const digitsBeforeCaret = digitsOnly(entered.slice(0, caret)).length;
        let nextDigits = digitsOnly(entered);

        if (entered.startsWith('+') && nextDigits.startsWith(countryCode)) {
          nextDigits = nextDigits.slice(countryCode.length);
        } else if (entered.startsWith('00') && nextDigits.startsWith(`00${countryCode}`)) {
          nextDigits = nextDigits.slice(countryCode.length + 2);
        }

        if (nextDigits === value && inputType === 'deleteContentBackward') {
          deleteDigit('backward', caret);
          return;
        }
        if (nextDigits === value && inputType === 'deleteContentForward') {
          deleteDigit('forward', caret);
          return;
        }

        pendingCaret.current = Math.min(digitsBeforeCaret, nextDigits.length);
        onValueChange(nextDigits);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          event.currentTarget.selectionStart !== event.currentTarget.selectionEnd
        )
          return;
        const caret = event.currentTarget.selectionStart;
        if (caret === null) return;
        if (event.key === 'Backspace' && caret > 0 && /\D/.test(formatted[caret - 1])) {
          event.preventDefault();
          deleteDigit('backward', caret);
        } else if (event.key === 'Delete' && /\D/.test(formatted[caret] ?? '')) {
          event.preventDefault();
          deleteDigit('forward', caret);
        }
      }}
    />
  );
});
