import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/lib/supabaseData', () => ({
  searchCustomers: vi.fn().mockResolvedValue([]),
  saveOrder: vi.fn(),
}));

import type { CatalogProduct } from '../../../shared/lib/domain';
import { useOrderForm } from '../hooks/useOrderForm';
import { createBlankScanDraft, type ScanDraft } from '../schemas/scanDraft';
import { OrderFormModal } from './OrderFormModal';

function fixture(): ScanDraft {
  const draft = createBlankScanDraft();
  draft.clientName = { value: 'Ana Silva', status: 'conferir' };
  draft.phone = { value: '912345678', status: 'provavel' };
  draft.items = [0, 1].map((index) => ({
    id: `item-${index}`,
    category: 'Pastelaria',
    product: `Bolo ${index + 1}`,
    quantityAmount: '2',
    quantityUnit: 'KG',
    notes: '',
    status: index === 0 ? 'provavel' : 'conferir',
  }));
  return draft;
}

function Harness({ catalog = [] }: { catalog?: CatalogProduct[] }) {
  const form = useOrderForm({
    catalogProducts: catalog,
    setAppError: vi.fn(),
    setAppSuccess: vi.fn(),
  });
  return (
    <>
      <button onClick={() => form.openScanDraft(fixture())}>Abrir revisão</button>
      {form.isModalOpen && (
        <OrderFormModal
          {...form}
          responsibles={[]}
          onAddProduct={form.addProductLine}
          onCustomerPickerOpen={form.closePickers}
          onClose={form.closeModal}
          onRemoveProduct={form.removeProductLine}
          onReturnToOrders={form.returnToOrders}
          onSubmit={form.saveOrder}
        />
      )}
    </>
  );
}

async function openForm(catalog: CatalogProduct[] = []) {
  const user = userEvent.setup();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Harness catalog={catalog} />
    </QueryClientProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Abrir revisão' }));
  return user;
}

function fieldStatus(label: string) {
  const input = screen.getByLabelText(label);
  return within(input.closest('[data-form-field]') as HTMLElement);
}

describe('revisão dos campos digitalizados', () => {
  it('associa a área do catálogo e permite confirmá-la sem apagar o produto', async () => {
    const user = await openForm([{ id: 'catalog-1', name: 'Bolo 1', category: 'Padaria' }]);
    const area = screen.getByLabelText('Área', { selector: '#order-item-0-category' });
    const product = screen.getByLabelText('Produto', { selector: '#order-item-0-product' });
    const areaField = within(area.closest('[data-form-field]') as HTMLElement);
    expect(area).toHaveValue('Padaria');
    expect(areaField.getByText('Conferir')).toBeVisible();
    expect(
      within(product.closest('[data-form-field]') as HTMLElement).getByText('Provável'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Mostrar áreas do produto 1' }));
    await user.click(screen.getByRole('option', { name: 'Padaria' }));
    expect(areaField.getByText('Conferido')).toBeVisible();
    expect(product).toHaveValue('Bolo 1');
    expect(
      within(product.closest('[data-form-field]') as HTMLElement).queryByText('Conferido'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Abrir revisão' }));
    expect(
      within(
        screen
          .getByLabelText('Área', { selector: '#order-item-0-category' })
          .closest('[data-form-field]') as HTMLElement,
      ).getByText('Conferir'),
    ).toBeVisible();
  }, 15_000);

  it('marca apenas os campos editados e mantém a confirmação ao voltar ao valor original', async () => {
    const user = await openForm();
    expect(fieldStatus('Nome do cliente').getByText('Conferir')).toBeVisible();
    expect(fieldStatus('Telefone').getByText('Provável')).toBeVisible();
    await user.type(screen.getByLabelText('Nome do cliente'), 'a');
    expect(fieldStatus('Nome do cliente').getByText('Conferido')).toBeVisible();
    expect(fieldStatus('Telefone').queryByText('Conferido')).not.toBeInTheDocument();
    await user.keyboard('{Backspace}');
    expect(fieldStatus('Nome do cliente').getByText('Conferido')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Responsável pela encomenda'), {
      target: { value: 'Maria' },
    });
    expect(fieldStatus('Responsável pela encomenda').getByText('Conferido')).toBeVisible();
    await user.type(screen.getByLabelText('Telefone'), '1');
    expect(fieldStatus('Telefone').getByText('Conferido')).toBeVisible();
  }, 15_000);

  it('confirma produto, quantidade e unidade separadamente e preserva a associação ao remover um item', async () => {
    const user = await openForm();
    const product = screen.getByLabelText('Produto', { selector: '#order-item-0-product' });
    fireEvent.change(product, { target: { value: 'Bolo de chocolate' } });
    const card = product.closest('article') as HTMLElement;
    expect(within(card).getAllByText('Conferido')).toHaveLength(1);
    await user.type(
      screen.getByLabelText('Quantidade', { selector: '#order-item-0-quantity' }),
      '3',
    );
    expect(within(card).getAllByText('Conferido')).toHaveLength(2);
    const unit = screen.getByRole('combobox', { name: 'Unidade do produto 1' });
    expect(
      within(unit.closest('[data-form-field]') as HTMLElement).getByText('Provável'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Mostrar unidades do produto 1' }));
    await user.click(screen.getByRole('option', { name: /^g$/ }));
    expect(within(card).getAllByText('Conferido')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Mostrar áreas do produto 1' }));
    await user.click(screen.getByRole('option', { name: 'Padaria' }));
    expect(product).toHaveValue('');
    expect(
      within(product.closest('[data-form-field]') as HTMLElement).getByText('Conferir'),
    ).toBeVisible();
    await user.click(within(card).getByRole('button', { name: 'Remover' }));
    expect(screen.getByLabelText('Produto')).toHaveValue('Bolo 2');
    expect(screen.queryByText('Conferido')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Abrir revisão' }));
    expect(screen.queryByText('Conferido')).not.toBeInTheDocument();
  }, 15_000);
});
