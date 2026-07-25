import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LogoutConfirmDialog } from '../../auth/components/LogoutConfirmDialog';
import { SessionHeader } from '../../auth/components/SessionHeader';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import { PrintOptionsDialog } from '../../reports/components/PrintOptionsDialog';
import { PrintableOrders } from '../../reports/components/PrintableOrders';
import { usePrintOrders } from '../../reports/hooks/usePrintOrders';
import { Alert } from '../../../shared/components/ui';
import { useModalBodyClass, useOutsidePointerDown } from '../../../shared/hooks';
import { getApiErrorMessage } from '../../../shared/lib/apiError';
import { recordRecoveryEvent } from '../../../shared/lib/recoveryArchive';
import { completeOrder, deleteOrder } from '../../../shared/lib/supabaseData';
import { CompleteOrderDialog } from '../components/CompleteOrderDialog';
import { DeleteOrderDialog } from '../components/DeleteOrderDialog';
import { OrderFilters } from '../components/OrderFilters';
import { OrderFormModal } from '../components/OrderFormModal';
import { OrderIndicators } from '../components/OrderIndicators';
import { OrderList } from '../components/OrderList';
import { OrderSuccessDialog } from '../components/OrderSuccessDialog';
import { useApiOrderData } from '../hooks/useApiOrderData';
import { useOrderFilters, useOrderFilterState } from '../hooks/useOrderFilters';
import { useOrderForm } from '../hooks/useOrderForm';
import styles from './OrdersPage.module.css';

export default function OrdersPage() {
  const navigate = useNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const tenantId = session.authUser?.tenantId ?? '';
  const filterState = useOrderFilterState();
  const data = useApiOrderData(filterState.queryParams, Boolean(session.authUser), tenantId);
  const filters = useOrderFilters(data.orders, data.overviewOrders, data.responsibles, filterState);
  const [appError, setAppError] = useState('');
  const [appSuccess, setAppSuccess] = useState('');
  const orderForm = useOrderForm({
    catalogProducts: data.catalogProducts,
    setAppError,
    setAppSuccess,
    tenantId: session.authUser?.tenantId ?? '',
  });
  const print = usePrintOrders(
    filters.sortedOrders,
    filters.dateFilter,
    filters.categoryFilter,
    data.contingencyOrders,
  );
  const removeMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => deleteOrder(id, version),
  });
  const completeMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => completeOrder(id, version),
  });
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [completeOrderId, setCompleteOrderId] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState('');
  const [deletionMessage, setDeletionMessage] = useState('');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const isSaving = removeMutation.isPending || completeMutation.isPending;
  const canChangeOrders = Boolean(session.authUser) && !data.isContingencyMode;

  useEffect(() => {
    if (!appSuccess) return;
    const timer = window.setTimeout(() => setAppSuccess(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [appSuccess]);

  function closeDropdowns() {
    orderForm.setOpenProductPickerId(null);
    orderForm.setOpenCategoryPickerId(null);
    orderForm.setOpenUnitPickerId(null);
    orderForm.setIsResponsiblePickerOpen(false);
    filters.setIsCategoryFilterOpen(false);
  }
  useOutsidePointerDown(closeDropdowns, '[data-combobox]');
  useModalBodyClass(
    orderForm.isModalOpen ||
      print.isPrintOptionsOpen ||
      Boolean(deleteOrderId) ||
      Boolean(completeOrderId) ||
      Boolean(completionMessage) ||
      Boolean(deletionMessage) ||
      isLogoutConfirmOpen,
  );

  const orderToDelete = useMemo(
    () => data.orders.find((order) => order.id === deleteOrderId) ?? null,
    [data.orders, deleteOrderId],
  );
  const orderToComplete = useMemo(
    () => data.orders.find((order) => order.id === completeOrderId) ?? null,
    [completeOrderId, data.orders],
  );

  async function refreshOrderData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] }),
      queryClient.invalidateQueries({ queryKey: ['supabase', 'contingency-snapshot'] }),
    ]);
  }

  async function handleLogout() {
    setAppError('');
    setAppSuccess('');
    try {
      await session.logout();
      filters.resetFilters();
      orderForm.closeModal();
      setDeleteOrderId(null);
      setCompleteOrderId(null);
      setCompletionMessage('');
      setDeletionMessage('');
      setIsLogoutConfirmOpen(false);
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível terminar sessão.'));
    }
  }

  async function confirmDeleteOrder() {
    if (!orderToDelete?.version) {
      setAppSuccess('');
      setAppError('A versão da encomenda não está disponível. Recarregue os dados.');
      return;
    }
    setAppError('');
    setAppSuccess('');
    try {
      await removeMutation.mutateAsync({ id: orderToDelete.id, version: orderToDelete.version });
      try {
        await recordRecoveryEvent(tenantId, {
          resource: 'order',
          action: 'deleted',
          resourceId: orderToDelete.id,
          before: orderToDelete,
        });
      } catch {
        setAppError(
          'A encomenda foi apagada, mas não foi possível atualizar o arquivo de recuperação deste dispositivo.',
        );
      }
      await refreshOrderData();
      setDeleteOrderId(null);
      setDeletionMessage(`Encomenda #${orderToDelete.orderNumber ?? '-'} apagada com sucesso.`);
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível apagar a encomenda.'));
    }
  }

  async function confirmCompleteOrder() {
    if (!orderToComplete?.version) {
      setAppSuccess('');
      setAppError('A versão da encomenda não está disponível. Recarregue os dados.');
      return;
    }
    setAppError('');
    setAppSuccess('');
    try {
      await completeMutation.mutateAsync({
        id: orderToComplete.id,
        version: orderToComplete.version,
      });
      try {
        await recordRecoveryEvent(tenantId, {
          resource: 'order',
          action: 'completed',
          resourceId: orderToComplete.id,
          before: orderToComplete,
        });
      } catch {
        setAppError(
          'A encomenda foi concluída, mas não foi possível atualizar o arquivo de recuperação deste dispositivo.',
        );
      }
      await refreshOrderData();
      setCompleteOrderId(null);
      setCompletionMessage(
        `Encomenda #${orderToComplete.orderNumber ?? '-'} concluída com sucesso.`,
      );
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível concluir a encomenda.'));
    }
  }

  if (session.isCheckingSession || !session.authUser) {
    return (
      <LoginPage
        isCheckingSession={session.isCheckingSession}
        sessionError={session.sessionError}
        onLogin={session.login}
      />
    );
  }

  const companyDisplayName = session.authUser.bakeryName || 'Empresa';
  const visibleError = appError || data.appError || print.printError;

  return (
    <>
      <main className={styles.shell} data-screen-only>
        <SessionHeader
          canManage={session.isOwner}
          userDisplayName={session.authUser.displayName}
          onLogoutRequest={() => setIsLogoutConfirmOpen(true)}
          onOpenSettings={() => navigate('/settings')}
        />
        {appSuccess && <Alert tone="success">{appSuccess}</Alert>}
        {data.isContingencyMode && (
          <Alert tone="info">
            Modo de contingência: o Supabase está indisponível. Estão a ser mostrados os dados
            guardados localmente em{' '}
            {new Intl.DateTimeFormat('pt-PT', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(data.contingencySavedAt))}
            . Pode consultar, pesquisar e imprimir normalmente. Criar, editar, concluir e apagar
            ficam bloqueados até a ligação ser corrigida.
          </Alert>
        )}
        {visibleError && <Alert tone="error">{visibleError}</Alert>}
        <OrderIndicators stats={filters.stats} total={data.overviewOrders.length} />
        <section className={styles.ordersPanel} aria-label="Encomendas">
          <OrderFilters
            categoryFilter={filters.categoryFilter}
            dateFilter={filters.dateFilter}
            isCategoryFilterOpen={filters.isCategoryFilterOpen}
            isReadOnly={data.isContingencyMode}
            resultCount={data.resultTotal}
            search={filters.search}
            onCategoryChange={filters.setCategoryFilter}
            onCategoryOpenChange={filters.setIsCategoryFilterOpen}
            onCreate={orderForm.openNewOrderModal}
            onDateChange={filters.setDateFilter}
            onPrint={print.openPrintOptions}
            onSearchChange={filters.setSearch}
          />
          <OrderList
            isLoading={data.isLoading}
            canComplete={canChangeOrders}
            canDelete={canChangeOrders}
            canEdit={canChangeOrders}
            orders={filters.filteredOrders}
            search={filters.search}
            getResponsibleName={filters.getResponsibleName}
            onComplete={(order) => setCompleteOrderId(order.id)}
            onDelete={setDeleteOrderId}
            onEdit={orderForm.editOrder}
            onPrint={print.startPrint}
          />
        </section>
      </main>
      {orderForm.isModalOpen && (
        <OrderFormModal
          catalogProductsByCategory={orderForm.catalogProductsByCategory}
          editingId={orderForm.editingId}
          isResponsiblePickerOpen={orderForm.isResponsiblePickerOpen}
          itemFields={orderForm.itemFields}
          methods={orderForm.methods}
          openCategoryPickerId={orderForm.openCategoryPickerId}
          openProductPickerId={orderForm.openProductPickerId}
          openUnitPickerId={orderForm.openUnitPickerId}
          responsibles={data.responsibles}
          onAddProduct={orderForm.addProductLine}
          onClose={orderForm.closeModal}
          onRemoveProduct={orderForm.removeProductLine}
          onReturnToOrders={orderForm.returnToOrders}
          onSubmit={orderForm.saveOrder}
          savedOrderMessage={orderForm.savedOrderMessage}
          setIsResponsiblePickerOpen={orderForm.setIsResponsiblePickerOpen}
          setOpenCategoryPickerId={orderForm.setOpenCategoryPickerId}
          setOpenProductPickerId={orderForm.setOpenProductPickerId}
          setOpenUnitPickerId={orderForm.setOpenUnitPickerId}
        />
      )}
      {orderToDelete && (
        <DeleteOrderDialog
          isSaving={isSaving}
          order={orderToDelete}
          onCancel={() => setDeleteOrderId(null)}
          onConfirm={confirmDeleteOrder}
        />
      )}
      {orderToComplete && (
        <CompleteOrderDialog
          isSaving={isSaving}
          order={orderToComplete}
          onCancel={() => setCompleteOrderId(null)}
          onConfirm={confirmCompleteOrder}
        />
      )}
      {completionMessage && (
        <OrderSuccessDialog
          description="A encomenda foi concluída corretamente e retirada da lista de pedidos ativos."
          message={completionMessage}
          onClose={() => {
            setCompletionMessage('');
            setAppSuccess(completionMessage);
          }}
        />
      )}
      {deletionMessage && (
        <OrderSuccessDialog
          description="A encomenda foi apagada corretamente."
          message={deletionMessage}
          onClose={() => {
            setDeletionMessage('');
            setAppSuccess(deletionMessage);
          }}
        />
      )}
      {isLogoutConfirmOpen && (
        <LogoutConfirmDialog
          companyDisplayName={companyDisplayName}
          isSaving={isSaving}
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleLogout}
        />
      )}
      {print.isPrintOptionsOpen && (
        <PrintOptionsDialog
          error={print.printOptionsError}
          isPreparing={print.isPreparingPrintOptions}
          orderCount={print.printOptionsOrderCount}
          printFrom={print.printFrom}
          printFromTime={print.printFromTime}
          printMode={print.printMode}
          printRangeMode={print.printRangeMode}
          printUntil={print.printUntil}
          printUntilTime={print.printUntilTime}
          onCancel={() => print.setIsPrintOptionsOpen(false)}
          onConfirm={print.confirmPrintOptions}
          onFromChange={print.setPrintFrom}
          onFromTimeChange={print.setPrintFromTime}
          onModeChange={print.setPrintMode}
          onRangeModeChange={print.setPrintRangeMode}
          onUntilChange={print.setPrintUntil}
          onUntilTimeChange={print.setPrintUntilTime}
        />
      )}
      <PrintableOrders
        getResponsibleName={filters.getResponsibleName}
        printAll={print.printAll}
        printDescription={print.printDescription}
        printFrom={print.printFrom}
        printFromTime={print.printFromTime}
        printMode={print.printMode}
        printOrderCount={print.printOrderCount}
        printOrders={print.printOrders}
        printProductSummary={print.printProductSummary}
        printRangeMode={print.printRangeMode}
        printUntil={print.printUntil}
        printUntilTime={print.printUntilTime}
      />
    </>
  );
}
