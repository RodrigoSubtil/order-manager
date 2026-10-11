import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../shared/lib/domain';

const state = vi.hoisted(() => ({ orders: [] as Order[] }));
const complete = vi.hoisted(() => vi.fn());
vi.mock('../../../app/router/navigation', () => ({ useAppNavigate: () => vi.fn() }));
vi.mock('../../auth/hooks/useSession', () => ({
  useSession: () => ({
    authUser: { id: 'local-test' },
    companyDisplayName: 'Teste',
    logout: vi.fn(),
  }),
}));
vi.mock('../../../shared/lib/supabaseData', () => ({
  completeOrder: complete,
  deleteOrder: vi.fn(),
  saveOrder: vi.fn(),
  searchCustomers: vi.fn().mockResolvedValue([]),
  listAllOrders: vi.fn().mockResolvedValue([]),
}));
vi.mock('../hooks/useApiOrderData', () => ({
  useApiOrderData: (params: { from?: string; search?: string }) => ({
    orders: state.orders.filter(
      (order) =>
        (!params.from || order.deliveryDate === params.from) &&
        (!params.search || order.clientName.includes(params.search)),
    ),
    overviewOrders: state.orders,
    responsibles: [],
    catalogProducts: [],
    isLoading: false,
    isOverviewLoading: false,
    appError: '',
    resultTotal: state.orders.length,
  }),
}));
import OrdersPage from './OrdersPage';

function sample(id: string, name: string, date: string, time: string, number: number): Order {
  return {
    id,
    clientName: name,
    deliveryDate: date,
    deliveryTime: time,
    orderNumber: number,
    version: 3,
    responsibleId: 'staff',
    responsibleName: 'Maria',
    phone: '912345678',
    products: [],
    createdAt: '2026-10-10T10:00:00Z',
  };
}
function openPage() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <OrdersPage />
    </QueryClientProvider>,
  );
}
function notice() {
  return within(screen.getByLabelText('Aviso de recolhas atrasadas'));
}
function orderCards() {
  return within(screen.getByRole('region', { name: 'Encomendas' })).getAllByRole('article');
}
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-11T10:12:00Z'));
  state.orders = [
    sample('previous', 'João Costa', '2026-10-10', '10:30', 3),
    sample('today', 'Ana Martins', '2026-10-11', '10:00', 4),
    sample('future', 'Maria Soares', '2026-10-11', '14:00', 5),
  ];
  complete.mockReset().mockImplementation(async (id: string) => {
    state.orders = state.orders.filter((order) => order.id !== id);
  });
});
afterEach(() => vi.restoreAllMocks());

describe('recolhas atrasadas no painel', () => {
  it('mostra o aviso global, inclui dias anteriores e recupera os filtros ao voltar', async () => {
    const user = userEvent.setup();
    openPage();
    expect(notice().getByRole('status')).toHaveTextContent('2 recolhas atrasadas');
    expect(screen.queryByRole('heading', { name: 'João Costa' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Pesquisar encomendas' }), {
      target: { value: 'Ana' },
    });
    await user.click(screen.getByRole('button', { name: 'Ver atrasadas' }));
    const cards = orderCards();
    expect(within(cards[0]).getByRole('heading', { name: 'João Costa' })).toBeVisible();
    expect(within(cards[1]).getByRole('heading', { name: 'Ana Martins' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Maria Soares' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar aos filtros' }));
    expect(screen.getByRole('textbox', { name: 'Pesquisar encomendas' })).toHaveValue('Ana');
    expect(screen.queryByRole('heading', { name: 'João Costa' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ana Martins' })).toBeVisible();
  });

  it('conclui uma encomenda de outro dia com a versão correta e atualiza o aviso', async () => {
    const user = userEvent.setup();
    openPage();
    await user.click(screen.getByRole('button', { name: 'Ver atrasadas' }));
    await user.click(within(orderCards()[0]).getByRole('button', { name: 'Concluir' }));
    await user.click(screen.getByRole('button', { name: 'Concluir encomenda' }));
    await waitFor(() => expect(complete).toHaveBeenCalledWith('previous', 3));
    await waitFor(() =>
      expect(notice().getByRole('status')).toHaveTextContent('1 recolha atrasada'),
    );
    expect(screen.queryByRole('heading', { name: 'João Costa' })).not.toBeInTheDocument();
  });

  it('não mostra aviso nem selo quando não há pendências atrasadas', () => {
    state.orders = state.orders.filter((order) => order.id === 'future');
    openPage();
    expect(screen.queryByLabelText('Aviso de recolhas atrasadas')).not.toBeInTheDocument();
    expect(screen.queryByText(/Recolha atrasada ·/)).not.toBeInTheDocument();
  });
});
