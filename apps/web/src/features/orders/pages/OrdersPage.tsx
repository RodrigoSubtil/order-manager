import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useAppNavigate } from '../../../app/router/navigation';
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
import { todayKey } from '../../../shared/lib/dateUtils';
import { completeOrder, deleteOrder } from '../../../shared/lib/supabaseData';
import { CompleteOrderDialog } from '../components/CompleteOrderDialog';
import { DeleteOrderDialog } from '../components/DeleteOrderDialog';
import { OrderFilters } from '../components/OrderFilters';
import { OrderFormModal } from '../components/OrderFormModal';
import { OrderIndicators } from '../components/OrderIndicators';
import { OrderList } from '../components/OrderList';
import { OrderSuccessDialog } from '../components/OrderSuccessDialog';
import { OrderScanModal } from '../components/OrderScanModal';
import { OverduePickupNotice } from '../components/OverduePickupNotice';
import { useMinuteClock } from '../hooks/useMinuteClock';
import { useOverduePickups } from '../hooks/useOverduePickups';
import { orderScanEnabled } from '../lib/scanApi';
import { useApiOrderData } from '../hooks/useApiOrderData';
import { useOrderFilters, useOrderFilterState } from '../hooks/useOrderFilters';
import { useOrderForm } from '../hooks/useOrderForm';
import styles from './OrdersPage.module.css';

export default function OrdersPage() {
  const navigate = useAppNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const now = useMinuteClock(Boolean(session.authUser));
  const currentDay = todayKey(new Date(now));
  const filterState = useOrderFilterState(currentDay);
  const data = useApiOrderData(filterState.queryParams, Boolean(session.authUser));
  const filters = useOrderFilters(
    data.orders,
    data.overviewOrders,
    data.responsibles,
    filterState,
    currentDay,
  );
  const overdue = useOverduePickups(data.overviewOrders, now);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const displayedOrders = overdueOnly ? overdue.orders : filters.filteredOrders;
  const [appError, setAppError] = useState('');
  const [appSuccess, setAppSuccess] = useState('');
  const orderForm = useOrderForm({
    catalogProducts: data.catalogProducts,
    setAppError,
    setAppSuccess,
  });
  const print = usePrintOrders(
    displayedOrders,
    overdueOnly ? '' : filters.dateFilter,
    overdueOnly ? 'Todas' : filters.categoryFilter,
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
  const [isScanOpen, setIsScanOpen] = useState(false);

  const isSaving = removeMutation.isPending || completeMutation.isPending;
  const canChangeOrders = Boolean(session.authUser);

  useEffect(() => {
    if (!appSuccess) return;
    const timer = window.setTimeout(() => setAppSuccess(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [appSuccess]);

  function closeDropdowns() {
    orderForm.setOpenProductPickerId(null);
    orderForm.setOpenCategoryPickerId(null);
    orderForm.setOpenQuantityPickerId(null);
    orderForm.setOpenUnitPickerId(null);
    orderForm.setIsResponsiblePickerOpen(false);
    filters.setIsCategoryFilterOpen(false);
  }
  useOutsidePointerDown(closeDropdowns, '[data-combobox]');
  useModalBodyClass(
    orderForm.isModalOpen ||
      isScanOpen ||
      print.isPrintOptionsOpen ||
      Boolean(deleteOrderId) ||
      Boolean(completeOrderId) ||
      Boolean(completionMessage) ||
      Boolean(deletionMessage) ||
      isLogoutConfirmOpen,
  );

  const orderToDelete = useMemo(
    () => displayedOrders.find((order) => order.id === deleteOrderId) ?? null,
    [displayedOrders, deleteOrderId],
  );
  const orderToComplete = useMemo(
    () => displayedOrders.find((order) => order.id === completeOrderId) ?? null,
    [completeOrderId, displayedOrders],
  );

  async function refreshOrderData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] }),
      queryClient.invalidateQueries({
        queryKey: ['supabase', 'orders-overview'],
      }),
    ]);
  }

  async function handleLogout() {
    setAppError('');
    setAppSuccess('');
    try {
      await session.logout();
      filters.resetFilters();
      setOverdueOnly(false);
      orderForm.closeModal();
      setIsScanOpen(false);
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
      await removeMutation.mutateAsync({
        id: orderToDelete.id,
        version: orderToDelete.version,
      });
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível apagar a encomenda.'));
      return;
    }
    setDeleteOrderId(null);
    setDeletionMessage(`Encomenda #${orderToDelete.orderNumber ?? '-'} apagada com sucesso.`);
    try {
      await refreshOrderData();
    } catch {
      setAppError(
        'A encomenda foi apagada, mas não foi possível atualizar a lista. Atualize a página.',
      );
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
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível concluir a encomenda.'));
      return;
    }
    setCompleteOrderId(null);
    setCompletionMessage(`Encomenda #${orderToComplete.orderNumber ?? '-'} concluída com sucesso.`);
    try {
      await refreshOrderData();
    } catch {
      setAppError(
        'A encomenda foi concluída, mas não foi possível atualizar a lista. Atualize a página.',
      );
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
        {visibleError && <Alert tone="error">{visibleError}</Alert>}
        <OrderIndicators stats={filters.stats} total={data.overviewOrders.length} />
        <OverduePickupNotice
          count={overdue.orders.length}
          active={overdueOnly}
          onToggle={() => setOverdueOnly((current) => !current)}
        />
        <section className={styles.ordersPanel} aria-label="Encomendas">
          <OrderFilters
            categoryFilter={overdueOnly ? 'Todas' : filters.categoryFilter}
            dateFilter={overdueOnly ? '' : filters.dateFilter}
            dateFilterMode={overdueOnly ? 'all' : filters.dateFilterMode}
            hasCustomDate={!overdueOnly && filters.hasCustomDate}
            isCategoryFilterOpen={filters.isCategoryFilterOpen}
            resultCount={displayedOrders.length}
            search={overdueOnly ? '' : filters.search}
            onCategoryChange={(value) => {
              setOverdueOnly(false);
              filters.setCategoryFilter(value);
            }}
            onCategoryOpenChange={filters.setIsCategoryFilterOpen}
            onCreate={orderForm.openNewOrderModal}
            onScan={orderScanEnabled ? () => setIsScanOpen(true) : undefined}
            onDateChange={(value) => {
              setOverdueOnly(false);
              filters.setDateFilter(value);
            }}
            onDateModeChange={(value) => {
              setOverdueOnly(false);
              filters.setDateFilterMode(value);
            }}
            onPrint={print.openPrintOptions}
            onSearchChange={(value) => {
              setOverdueOnly(false);
              filters.setSearch(value);
            }}
          />
          <OrderList
            isLoading={overdueOnly ? data.isOverviewLoading : data.isLoading}
            now={now}
            canComplete={canChangeOrders}
            canDelete={canChangeOrders}
            canEdit={canChangeOrders}
            orders={displayedOrders}
            search={overdueOnly ? '' : filters.search}
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
          openQuantityPickerId={orderForm.openQuantityPickerId}
          openUnitPickerId={orderForm.openUnitPickerId}
          responsibles={data.responsibles}
          onAddProduct={orderForm.addProductLine}
          onCustomerPickerOpen={orderForm.closePickers}
          onClose={orderForm.closeModal}
          onRemoveProduct={orderForm.removeProductLine}
          onReturnToOrders={orderForm.returnToOrders}
          onSubmit={orderForm.saveOrder}
          savedOrderMessage={orderForm.savedOrderMessage}
          scanDraft={orderForm.scanDraft}
          setIsResponsiblePickerOpen={orderForm.setIsResponsiblePickerOpen}
          setOpenCategoryPickerId={orderForm.setOpenCategoryPickerId}
          setOpenProductPickerId={orderForm.setOpenProductPickerId}
          setOpenQuantityPickerId={orderForm.setOpenQuantityPickerId}
          setOpenUnitPickerId={orderForm.setOpenUnitPickerId}
        />
      )}
      {isScanOpen && (
        <OrderScanModal
          onClose={() => setIsScanOpen(false)}
          onReview={(draft) => {
            setIsScanOpen(false);
            orderForm.openScanDraft(draft);
          }}
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
          message={completionMessage}
          onClose={() => {
            setCompletionMessage('');
            setAppSuccess(completionMessage);
          }}
        />
      )}
      {deletionMessage && (
        <OrderSuccessDialog
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
          printCategory={print.printCategory}
          printFrom={print.printFrom}
          printFromTime={print.printFromTime}
          printMode={print.printMode}
          printUntil={print.printUntil}
          printUntilTime={print.printUntilTime}
          onCancel={() => print.setIsPrintOptionsOpen(false)}
          onCategoryChange={print.setPrintCategory}
          onConfirm={print.confirmPrintOptions}
          onFromChange={print.setPrintFrom}
          onFromTimeChange={print.setPrintFromTime}
          onModeChange={print.setPrintMode}
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
