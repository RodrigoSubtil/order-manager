import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';
import { Combobox, ComboboxInput, ComboboxList, ComboboxOption, ComboboxTrigger } from './Combobox';
import { Dialog } from './Dialog';
import { Input } from './Input';

function DialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir diálogo</Button>
      {open && (
        <Dialog titleId="test-dialog-title" onClose={() => setOpen(false)}>
          <h2 id="test-dialog-title">Diálogo de teste</h2>
          <Input data-autofocus aria-label="Campo inicial" />
          <Button onClick={() => setOpen(false)}>Fechar diálogo</Button>
        </Dialog>
      )}
    </>
  );
}

describe('accessible UI primitives', () => {
  it('moves focus into the dialog, closes with Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<DialogExample />);
    const trigger = screen.getByRole('button', { name: 'Abrir diálogo' });

    await user.click(trigger);
    expect(screen.getByRole('textbox', { name: 'Campo inicial' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('exposes a listbox and supports arrow navigation and Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Combobox id="area" isOpen={false} onOpenChange={onOpenChange}>
        <ComboboxInput aria-label="Área" value="Todas" readOnly />
        <ComboboxTrigger aria-label="Mostrar áreas" />
      </Combobox>,
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar áreas' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('combobox', { name: 'Área' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    rerender(
      <Combobox id="area" isOpen onOpenChange={onOpenChange}>
        <ComboboxInput aria-label="Área" value="Todas" readOnly />
        <ComboboxTrigger aria-label="Mostrar áreas" />
        <ComboboxList>
          <ComboboxOption>Pastelaria</ComboboxOption>
          <ComboboxOption>Padaria</ComboboxOption>
        </ComboboxList>
      </Combobox>,
    );

    const input = screen.getByRole('combobox', { name: 'Área' });
    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Pastelaria' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Padaria' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(input).toHaveFocus();
  });
});
