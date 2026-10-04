import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { PhoneInput } from './PhoneInput';

function Example() {
  const [countryCode, setCountryCode] = useState('351');
  const [phone, setPhone] = useState('');
  return (
    <>
      <PhoneInput
        aria-label="Telefone"
        countryCode={countryCode}
        value={phone}
        onValueChange={setPhone}
      />
      <output data-testid="saved-phone">{phone}</output>
      <button type="button" onClick={() => setCountryCode('55')}>
        Brasil
      </button>
    </>
  );
}

describe('PhoneInput', () => {
  it('formats while typing and keeps only digits in the form value', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '912345678');
    expect(input).toHaveValue('912 345 678');
    expect(screen.getByTestId('saved-phone')).toHaveTextContent('912345678');

    await user.click(screen.getByRole('button', { name: 'Brasil' }));
    expect(input).not.toHaveValue('912 345 678');
    expect(screen.getByTestId('saved-phone')).toHaveTextContent('912345678');
  });

  it('deletes a digit when backspacing over a formatting separator', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const input = screen.getByRole('textbox', { name: 'Telefone' }) as HTMLInputElement;

    await user.type(input, '912345');
    expect(input).toHaveValue('912 345');
    input.setSelectionRange(4, 4);
    await user.keyboard('{Backspace}');

    expect(screen.getByTestId('saved-phone')).toHaveTextContent('91345');
    expect(input).toHaveValue('913 45');
  });
});
