import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

const searchCustomers = vi.hoisted(() => vi.fn());
vi.mock('../../../shared/lib/supabaseData', () => ({ searchCustomers }));

import type { OrderFormValues } from '../schemas/orderSchema';
import { CustomerPicker } from './CustomerPicker';

function Form() {
  const methods = useForm<OrderFormValues>({
    defaultValues: {
      clientName: '',
      customerId: null,
      phoneCountryCode: '351',
      phone: '',
    },
  });
  const phone = useWatch({ control: methods.control, name: 'phone' });
  const phoneCountryCode = useWatch({
    control: methods.control,
    name: 'phoneCountryCode',
  });
  const customerId = useWatch({ control: methods.control, name: 'customerId' });
  return (
    <>
      <CustomerPicker methods={methods} />
      <output data-testid="phone">{phone}</output>
      <output data-testid="phone-country-code">{phoneCountryCode}</output>
      <output data-testid="customer-id">{customerId}</output>
    </>
  );
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Form />
    </QueryClientProvider>,
  );
}

describe('CustomerPicker', () => {
  it('starts closed and searches as soon as one letter is typed', async () => {
    searchCustomers.mockReset();
    searchCustomers.mockResolvedValue([
      { id: '1', name: 'Ana Silva', phone: '912345678', version: 1 },
    ]);
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByRole('combobox', { name: 'Nome do cliente' });

    input.focus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Digite pelo menos/)).not.toBeInTheDocument();

    await user.type(input, 'A');

    await waitFor(() => expect(searchCustomers).toHaveBeenCalledWith('A'));
    expect(
      await screen.findByRole('option', {
        name: 'Ana Silva, telefone +351 912345678',
      }),
    ).toBeVisible();
  });

  it('searches after typing and fills phone by selecting a homonym', async () => {
    searchCustomers.mockReset();
    searchCustomers.mockResolvedValue([
      { id: '1', name: 'Ana Silva', phone: '912345678', version: 1 },
      { id: '2', name: 'Ana Silva', phone: '933333333', version: 1 },
    ]);
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByRole('combobox', { name: 'Nome do cliente' }), 'An');
    await waitFor(() => expect(searchCustomers).toHaveBeenCalledWith('An'));
    await user.click(
      await screen.findByRole('option', {
        name: /Ana Silva, telefone \+351 933333333/,
      }),
    );
    expect(screen.getByTestId('phone')).toHaveTextContent('933333333');
    expect(screen.getByTestId('phone-country-code')).toHaveTextContent('351');
    expect(screen.getByTestId('customer-id')).toHaveTextContent('2');
    expect(
      screen.getByText('Cliente selecionado. Alterar nome ou telefone atualiza este cadastro.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Trocar cliente' })).not.toBeInTheDocument();
  });

  it('supports choosing the first suggestion with the keyboard', async () => {
    searchCustomers.mockReset();
    searchCustomers.mockResolvedValue([
      { id: '3', name: 'Beatriz', phone: '911111111', version: 1 },
    ]);
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByRole('combobox', { name: 'Nome do cliente' });
    await user.type(input, 'Be');
    await screen.findByRole('option', {
      name: 'Beatriz, telefone +351 911111111',
    });
    input.focus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('phone')).toHaveTextContent('911111111');
  });

  it('restores the country prefix and national number of an international customer', async () => {
    searchCustomers.mockReset();
    searchCustomers.mockResolvedValue([
      { id: '4', name: 'Bruna', phone: '5511999999999', version: 1 },
    ]);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole('combobox', { name: 'Nome do cliente' }), 'Br');
    await user.click(
      await screen.findByRole('option', {
        name: 'Bruna, telefone +55 11999999999',
      }),
    );

    expect(screen.getByTestId('phone-country-code')).toHaveTextContent('55');
    expect(screen.getByTestId('phone')).toHaveTextContent('11999999999');
  });
});
