import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createOrder,
  deleteOrderById,
  deleteOrdersByDateRange,
  fetchOrders,
  updateOrder,
} from './ordersApi';
import { getCurrentAppUser, loginAppUser, logoutAppUser, type LoggedUser } from './authApi';
import { categories, type Category, type Order, type OrderForm, type ProductLine } from './types';
import './App.css';

function createId() {
  return crypto.randomUUID();
}

function todayKey() {
  return new Date().toLocaleDateString('sv-SE');
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString('sv-SE');
}

function createProductLine(
  product = '',
  quantity = '',
  category: Category = 'Pastelaria',
  notes = '',
): ProductLine {
  return {
    id: createId(),
    category,
    product,
    quantity,
    notes,
  };
}

function createEmptyForm(): OrderForm {
  return {
    clientName: '',
    phone: '',
    deliveryDate: todayKey(),
    deliveryTime: '',
    products: [createProductLine()],
  };
}

function formatDate(date: string) {
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function groupProducts(products: ProductLine[]) {
  return categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.category === category),
    }))
    .filter((group) => group.products.length > 0);
}

function resizeTextArea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export default function App() {
  const [authUser, setAuthUser] = useState<LoggedUser | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<OrderForm>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(todayKey());
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | Category>('Todas');
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const [printAll, setPrintAll] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [isDeletePreviousOpen, setIsDeletePreviousOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [deletePreviousFrom, setDeletePreviousFrom] = useState('');
  const [deletePreviousUntil, setDeletePreviousUntil] = useState(yesterdayKey);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appError, setAppError] = useState('');

  const loadOrders = useCallback(async (appUserId: string) => {
    setIsLoading(true);
    setAppError('');

    try {
      setOrders(await fetchOrders(appUserId));
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Nao foi possivel carregar as encomendas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function restoreSession() {
      setIsCheckingSession(true);
      setLoginError('');

      try {
        setAuthUser(await getCurrentAppUser());
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : 'Nao foi possivel verificar a sessao.');
      } finally {
        setIsCheckingSession(false);
      }
    }

    void restoreSession();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    void loadOrders(authUser.id);
  }, [authUser, loadOrders]);

  useEffect(() => {
    document.body.classList.toggle(
      'modal-open',
      isModalOpen ||
      Boolean(deleteOrderId) ||
      isDeletePreviousOpen ||
      isLogoutConfirmOpen,
    );

    return () => document.body.classList.remove('modal-open');
  }, [deleteOrderId, isDeletePreviousOpen, isLogoutConfirmOpen, isModalOpen]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const first = `${a.deliveryDate} ${a.deliveryTime}`;
        const second = `${b.deliveryDate} ${b.deliveryTime}`;
        return first.localeCompare(second);
      }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sortedOrders.filter((order) => {
      const productText = order.products
        .map((product) => `${product.category} ${product.product} ${product.quantity} ${product.notes}`)
        .join(' ')
        .toLowerCase();

      const matchesDate = !dateFilter || order.deliveryDate === dateFilter;

      const matchesCategory =
        categoryFilter === 'Todas' ||
        order.products.some((product) => product.category === categoryFilter);

      const matchesSearch =
        !term ||
        order.clientName.toLowerCase().includes(term) ||
        order.phone.toLowerCase().includes(term) ||
        productText.includes(term);

      return matchesDate && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, dateFilter, search, sortedOrders]);

  const printOrders = useMemo(() => {
    if (printAll) {
      return sortedOrders;
    }

    return sortedOrders.filter((order) => order.id === printOrderId);
  }, [printAll, printOrderId, sortedOrders]);

  const stats = useMemo(() => {
    const today = todayKey();

    return orders.reduce(
      (acc, order) => {
        if (order.deliveryDate && order.deliveryDate < today) acc.previous += 1;
        if (order.deliveryDate === today) acc.today += 1;
        if (order.deliveryDate > today) acc.upcoming += 1;
        return acc;
      },
      { previous: 0, today: 0, upcoming: 0 },
    );
  }, [orders]);

  const orderToDelete = useMemo(
    () => orders.find((order) => order.id === deleteOrderId) ?? null,
    [deleteOrderId, orders],
  );

  const deletePreviousCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.deliveryDate &&
          (!deletePreviousFrom || order.deliveryDate >= deletePreviousFrom) &&
          order.deliveryDate <= deletePreviousUntil,
      ).length,
    [deletePreviousFrom, deletePreviousUntil, orders],
  );

  const companyDisplayName = authUser?.bakeryName || 'Empresa';

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const user = await loginAppUser(loginUsername, loginPassword);
      setAuthUser(user);
      setLoginPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Nao foi possivel iniciar sessao.');
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    setIsSaving(true);
    setAppError('');

    try {
      await logoutAppUser();
      setAuthUser(null);
      setOrders([]);
      setSearch('');
      setDateFilter(todayKey());
      setCategoryFilter('Todas');
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
      setAppError('');
      setIsModalOpen(false);
      setDeleteOrderId(null);
      setIsDeletePreviousOpen(false);
      setIsLogoutConfirmOpen(false);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Nao foi possivel terminar sessao.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof OrderForm>(field: K, value: OrderForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateProductLine(id: string, field: keyof Omit<ProductLine, 'id'>, value: string) {
    setForm((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === id ? { ...product, [field]: value } : product,
      ),
    }));
  }

  function addProductLine() {
    setForm((current) => ({
      ...current,
      products: [...current.products, createProductLine('', '', current.products.at(-1)?.category)],
    }));
  }

  function removeProductLine(id: string) {
    setForm((current) => ({
      ...current,
      products:
        current.products.length === 1
          ? [createProductLine()]
          : current.products.filter((product) => product.id !== id),
    }));
  }

  function openNewOrderModal() {
    setForm(createEmptyForm());
    setEditingId(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(createEmptyForm());
    setEditingId(null);
  }

  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser) {
      setAppError('Sessao invalida. Entre novamente.');
      return;
    }

    setIsSaving(true);
    setAppError('');

    const cleanProducts = form.products
      .map((product) => ({
        ...product,
        product: product.product.trim(),
        quantity: product.quantity.trim(),
        notes: product.notes.trim(),
      }))
      .filter((product) => product.product || product.quantity);

    if (!cleanProducts.length) {
      setIsSaving(false);
      return;
    }

    try {
      const nextOrder = {
        ...form,
        products: cleanProducts,
      };

      if (editingId) {
        await updateOrder(authUser.id, editingId, nextOrder);
      } else {
        await createOrder(authUser.id, nextOrder);
      }

      await loadOrders(authUser.id);
      closeModal();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Nao foi possivel guardar a encomenda.');
    } finally {
      setIsSaving(false);
    }
  }

  function editOrder(order: Order) {
    setForm({
      clientName: order.clientName,
      phone: order.phone,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      products: order.products.map((product) => ({ ...product })),
    });

    setEditingId(order.id);
    setIsModalOpen(true);
  }

  function deleteOrder(id: string) {
    setDeleteOrderId(id);
  }

  function cancelDeleteOrder() {
    setDeleteOrderId(null);
  }

  async function confirmDeleteOrder() {
    if (!authUser) {
      setAppError('Sessao invalida. Entre novamente.');
      return;
    }

    if (!deleteOrderId) {
      return;
    }

    setIsSaving(true);
    setAppError('');

    try {
      await deleteOrderById(authUser.id, deleteOrderId);
      await loadOrders(authUser.id);
      setDeleteOrderId(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Nao foi possivel apagar a encomenda.');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeletePreviousOrders() {
    if (!authUser) {
      setAppError('Sessao invalida. Entre novamente.');
      return;
    }

    setIsSaving(true);
    setAppError('');

    try {
      await deleteOrdersByDateRange(authUser.id, deletePreviousFrom, deletePreviousUntil);
      await loadOrders(authUser.id);
      setIsDeletePreviousOpen(false);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Nao foi possivel excluir o periodo.');
    } finally {
      setIsSaving(false);
    }
  }

  function openDeletePreviousModal() {
    setDeletePreviousFrom('');
    setDeletePreviousUntil(yesterdayKey());
    setIsDeletePreviousOpen(true);
  }

  function startPrint(orderId?: string) {
    setPrintAll(!orderId);
    setPrintOrderId(orderId ?? null);
    window.setTimeout(() => window.print(), 80);
  }

  if (isCheckingSession) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <div className="login-brand">
            <span className="eyebrow">Order Manager</span>
            <h1>A carregar sessão</h1>
            <p>A verificar o acesso ao painel.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <div className="login-brand">
            <span className="eyebrow">Order Manager</span>
            <h1>Entrar no painel</h1>
            <p>Acesso reservado para utilizadores autorizados.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                required
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
                placeholder="Digite o email"
                autoComplete="username"
              />
            </label>

            <label>
              Palavra-passe
              <input
                required
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Digite a palavra-passe"
                autoComplete="current-password"
              />
            </label>

            {loginError && <div className="app-message error-message">{loginError}</div>}

            <button className="primary-button" type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="dashboard-shell">
        <header className="dashboard-topbar">
          <div>
            <span className="eyebrow">Order Manager</span>
            <h1>Painel de encomendas</h1>
          </div>

          <div className="topbar-actions topbar-actions-logout">
            <button
              className="secondary-button logout-button topbar-user-button"
              type="button"
              tabIndex={-1}
            >
              Empresa: {companyDisplayName}
            </button>

            <button
              className="secondary-button logout-button"
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
            >
              Sair
            </button>
          </div>
        </header>

        {appError && <div className="app-message error-message">{appError}</div>}

        <section className="stats-grid" aria-label="Resumo das encomendas">
          <article className="previous-card">
            <div>
              <span>Encomendas anteriores</span>
              <strong>{stats.previous}</strong>
            </div>

            <button
              className="previous-clean-button"
              type="button"
              disabled={stats.previous === 0}
              onClick={openDeletePreviousModal}
            >
              Excluir anteriores
            </button>
          </article>

          <article>
            <span>Total de encomendas</span>
            <strong>{orders.length}</strong>
          </article>

          <article>
            <span>Encomendas de hoje</span>
            <strong>{stats.today}</strong>
          </article>

          <article>
            <span>Encomendas dos próximos dias</span>
            <strong>{stats.upcoming}</strong>
          </article>
        </section>

        <section className="orders-panel">
          <div className="toolbar toolbar-layout">
            <div className="toolbar-top-row">
              <input
                aria-label="Filtrar por data"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />

              <select
                aria-label="Filtrar por area"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as 'Todas' | Category)}
              >
                <option value="Todas">Todas as areas</option>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <button className="secondary-button" type="button" onClick={() => setDateFilter(todayKey())}>
                Hoje
              </button>

              <button className="secondary-button" type="button" onClick={() => setDateFilter('')}>
                Todas as datas
              </button>

              <button
                className="toolbar-action-button print-toolbar-button"
                type="button"
                aria-label="Imprimir todas"
                title="Imprimir todas"
                onClick={() => startPrint()}
              >
                <span aria-hidden="true">⎙</span>
              </button>

              <button
                className="toolbar-action-button create-toolbar-button"
                type="button"
                aria-label="Nova encomenda"
                title="Nova encomenda"
                onClick={openNewOrderModal}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>

            <input
              className="search-input-full"
              aria-label="Pesquisar encomendas"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por cliente, telefone ou produto"
            />
          </div>

          <div className="active-filter">
            {dateFilter ? (
              <span>
                A mostrar encomendas de {formatDate(dateFilter)}
                {categoryFilter !== 'Todas' && ` em ${categoryFilter}`}
              </span>
            ) : (
              <span>
                A mostrar encomendas de todas as datas
                {categoryFilter !== 'Todas' && ` em ${categoryFilter}`}
              </span>
            )}
          </div>

          <div className="order-list">
            {isLoading ? (
              <div className="empty-state">
                <strong>A carregar encomendas...</strong>
                <span>A ligar ao Supabase.</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma encomenda encontrada.</strong>
                <span>Clique em Nova encomenda para registar o proximo pedido.</span>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <article className="order-card" key={order.id}>
                  <aside className="order-date-strip" aria-label="Data de entrega">
                    <span>Entrega</span>
                    <strong>{formatDate(order.deliveryDate)}</strong>
                    <small>{order.deliveryTime || 'Sem hora'}</small>
                  </aside>

                  <div className="order-ticket">
                    <header className="order-ticket-head">
                      <div className="order-client">
                        <span>Cliente</span>
                        <h2>{order.clientName}</h2>
                        <p>{order.phone || 'Sem telefone'}</p>
                      </div>
                    </header>

                    <div className="order-products" aria-label="Produtos da encomenda">
                      {order.products.map((product) => (
                        <div className="product-item" key={product.id}>
                          <span className="product-category-badge">{product.category}</span>

                          <div className="product-copy">
                            <strong>{product.product || 'Produto sem nome'}</strong>
                            {product.notes && <small>{product.notes}</small>}
                          </div>

                          <span className="product-quantity">{product.quantity || 'Quantidade nao indicada'}</span>
                        </div>
                      ))}
                    </div>

                    <footer className="order-footer">
                      <div className="card-actions">
                        <button type="button" onClick={() => editOrder(order)}>
                          Editar
                        </button>

                        <button type="button" onClick={() => startPrint(order.id)}>
                          Imprimir
                        </button>

                        <button type="button" onClick={() => deleteOrder(order.id)}>
                          Apagar
                        </button>
                      </div>
                    </footer>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <form onSubmit={saveOrder}>
              <header className="modal-header">
                <div>
                  <span className="eyebrow">{editingId ? 'Editar pedido' : 'Novo pedido'}</span>
                  <h2 id="modal-title">{editingId ? 'Editar encomenda' : 'Adicionar encomenda'}</h2>
                </div>

                <button className="icon-button" type="button" aria-label="Fechar" onClick={closeModal}>
                  x
                </button>
              </header>

              <div className="modal-body">
                <div className="field-grid">
                  <label>
                    Nome do cliente
                    <input
                      required
                      value={form.clientName}
                      onChange={(event) => updateField('clientName', event.target.value)}
                      placeholder="Ex.: Ana Silva"
                    />
                  </label>

                  <label>
                    Telefone
                    <input
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder="Ex.: 912 000 000"
                    />
                  </label>

                  <label>
                    Data de entrega
                    <input
                      required
                      type="date"
                      value={form.deliveryDate}
                      onChange={(event) => updateField('deliveryDate', event.target.value)}
                    />
                  </label>

                  <label>
                    Hora
                    <input
                      type="time"
                      value={form.deliveryTime}
                      onChange={(event) => updateField('deliveryTime', event.target.value)}
                    />
                  </label>
                </div>

                <section className="product-editor">
                  <div className="product-editor-title">
                    <div>
                      <span className="eyebrow">Preparacao</span>
                      <h3>Produtos separados por area</h3>
                    </div>

                    <button className="secondary-button" type="button" onClick={addProductLine}>
                      Adicionar produto
                    </button>
                  </div>

                  {form.products.map((product, index) => (
                    <article className="product-form-card" key={product.id}>
                      <div className="product-form-top">
                        <strong>Produto {index + 1}</strong>

                        <button type="button" onClick={() => removeProductLine(product.id)}>
                          Remover
                        </button>
                      </div>

                      <div className="product-form-grid">
                        <label>
                          Area
                          <select
                            value={product.category}
                            onChange={(event) =>
                              updateProductLine(product.id, 'category', event.target.value)
                            }
                          >
                            {categories.map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                        </label>

                        <label className="product-name-field">
                          Produto
                          <input
                            required
                            value={product.product}
                            onChange={(event) =>
                              updateProductLine(product.id, 'product', event.target.value)
                            }
                            placeholder="Ex.: Bolo de chocolate"
                          />
                        </label>

                        <label>
                          Quantidade
                          <input
                            required
                            value={product.quantity}
                            onChange={(event) =>
                              updateProductLine(product.id, 'quantity', event.target.value)
                            }
                            placeholder="Ex.: 2 kg ou 50 un."
                          />
                        </label>

                        <label className="product-note-field">
                          Observacao deste produto
                          <textarea
                            className="product-note-input"
                            rows={3}
                            value={product.notes}
                            onChange={(event) => {
                              updateProductLine(product.id, 'notes', event.target.value);
                              resizeTextArea(event.currentTarget);
                            }}
                            onFocus={(event) => resizeTextArea(event.currentTarget)}
                            placeholder="Ex.: sem acucar, mensagem no bolo, bem assado..."
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </section>
              </div>

              <footer className="modal-actions">
                <button className="secondary-button" type="button" disabled={isSaving} onClick={closeModal}>
                  Cancelar
                </button>

                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? 'A guardar...' : editingId ? 'Guardar alteracoes' : 'Guardar encomenda'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {orderToDelete && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <span className="eyebrow">Confirmar exclusao</span>
            <h2 id="delete-title">Apagar esta encomenda?</h2>

            <p>
              Esta acao vai remover a encomenda de <strong>{orderToDelete.clientName}</strong>.
            </p>

            <div className="confirm-details">
              <span>{formatDate(orderToDelete.deliveryDate)}</span>
              <span>{orderToDelete.deliveryTime || 'Sem hora marcada'}</span>
              <span>{orderToDelete.phone || 'Sem telefone'}</span>
            </div>

            <div className="confirm-actions">
              <button className="secondary-button" type="button" disabled={isSaving} onClick={cancelDeleteOrder}>
                Cancelar
              </button>

              <button className="danger-button" type="button" disabled={isSaving} onClick={confirmDeleteOrder}>
                {isSaving ? 'A apagar...' : 'Apagar encomenda'}
              </button>
            </div>
          </section>
        </div>
      )}

      {isDeletePreviousOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-previous-title"
          >
            <span className="eyebrow">Limpar anteriores</span>
            <h2 id="delete-previous-title">Excluir todas as encomendas anteriores?</h2>

            <p>
              Escolha o periodo que deve ser limpo. Se deixar o inicio vazio, apaga desde a primeira
              encomenda ate a data final.
            </p>

            <div className="confirm-date-grid">
              <label className="confirm-date-field">
                De
                <input
                  type="date"
                  value={deletePreviousFrom}
                  onChange={(event) => setDeletePreviousFrom(event.target.value)}
                />
              </label>

              <label className="confirm-date-field">
                Ate
                <input
                  required
                  type="date"
                  value={deletePreviousUntil}
                  onChange={(event) => setDeletePreviousUntil(event.target.value)}
                />
              </label>
            </div>

            <div className="confirm-details">
              <span>
                {deletePreviousCount}{' '}
                {deletePreviousCount === 1 ? 'encomenda sera apagada' : 'encomendas serao apagadas'}
              </span>
            </div>

            <div className="confirm-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={isSaving}
                onClick={() => setIsDeletePreviousOpen(false)}
              >
                Cancelar
              </button>

              <button
                className="danger-button"
                type="button"
                disabled={isSaving}
                onClick={confirmDeletePreviousOrders}
              >
                {isSaving ? 'A excluir...' : 'Excluir anteriores'}
              </button>
            </div>
          </section>
        </div>
      )}

      {isLogoutConfirmOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <span className="eyebrow">Confirmar saída</span>
            <h2 id="logout-title">Deseja realmente sair?</h2>

            <p>
              Ao sair, será necessário iniciar sessão novamente para voltar ao painel.
            </p>

            <div className="confirm-details">
              <span>Utilizador: {companyDisplayName}</span>
            </div>

            <div className="confirm-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={isSaving}
                onClick={() => setIsLogoutConfirmOpen(false)}
              >
                Cancelar
              </button>

              <button className="danger-button" type="button" disabled={isSaving} onClick={handleLogout}>
                {isSaving ? 'A sair...' : 'Sair'}
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="print-area" aria-hidden="true">
        <div className="print-title">
          <div>
            <strong>Venus Encomendas</strong>
            <span>Ordem de producao</span>
          </div>

          <small>{printAll ? 'Todas as encomendas' : 'Ficha individual'}</small>
        </div>

        {printOrders.map((order) => (
          <article className="print-card" key={order.id}>
            <header className="print-card-header">
              <div className="print-client">
                <span>Cliente</span>
                <h2>{order.clientName}</h2>
                <p>Telefone: {order.phone || 'Sem telefone'}</p>
              </div>

              <div className="print-delivery">
                <span>Entrega</span>
                <strong>{formatDate(order.deliveryDate)}</strong>
                <small>{order.deliveryTime || 'Sem hora marcada'}</small>
              </div>
            </header>

            <div className="print-products">
              {groupProducts(order.products).map((group) => (
                <section className="print-group" key={group.category}>
                  <h3>{group.category}</h3>

                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Obs.</th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.products.map((product) => (
                        <tr key={product.id}>
                          <td>{product.product}</td>
                          <td>{product.quantity}</td>
                          <td>{product.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
