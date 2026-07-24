import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LogoutConfirmDialog } from '../../auth/components/LogoutConfirmDialog';
import { SessionHeader } from '../../auth/components/SessionHeader';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import { PrintOptionsDialog } from '../../reports/components/PrintOptionsDialog';
import { PrintableOrders } from '../../reports/components/PrintableOrders';
import { usePrintOrders } from '../../reports/hooks/usePrintOrders';
import { useModalBodyClass, useOutsidePointerDown } from '../../../shared/hooks';
import { Alert } from '../../../shared/components/ui';
import { getApiErrorMessage } from '../../../shared/lib/apiError';
import { yesterdayKey } from '../../../shared/lib/dateUtils';
import {
  confirmBulkDelete,
  deleteOrder,
  previewBulkDelete,
  type BulkDeletePreview,
} from '../../../shared/lib/supabaseData';
import { DeleteOrderDialog } from '../components/DeleteOrderDialog';
import { DeletePreviousOrdersDialog } from '../components/DeletePreviousOrdersDialog';
import { OrderFilters } from '../components/OrderFilters';
import { OrderFormModal } from '../components/OrderFormModal';
import { OrderIndicators } from '../components/OrderIndicators';
import { OrderList } from '../components/OrderList';
import { OrdersPagination } from '../components/OrdersPagination';
import { useApiOrderData } from '../hooks/useApiOrderData';
import { useOrderFilters, useOrderFilterState } from '../hooks/useOrderFilters';
import { useOrderForm } from '../hooks/useOrderForm';
import styles from './OrdersPage.module.css';

export default function OrdersPage() {
  const navigate = useNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const filterState = useOrderFilterState();
  const data = useApiOrderData(filterState.queryParams, Boolean(session.authUser));
  const filters = useOrderFilters(data.orders, data.responsibles, filterState);
  const [appError, setAppError] = useState('');
  const [appSuccess, setAppSuccess] = useState('');
  const orderForm = useOrderForm({
    catalogProducts: data.catalogProducts,
    onReturnToOrders: (deliveryDate) => {
      filterState.setDateFilter(deliveryDate);
      filterState.setPage(1);
    },
    setAppError,
    setAppSuccess,
  });
  const print = usePrintOrders(filters.sortedOrders, filters.dateFilter, filters.categoryFilter);
  const removeMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => deleteOrder(id, version),
  });
  const previewBulkDeleteMutation = useMutation({
    mutationFn: ({ from, until }: { from: string; until: string }) =>
      previewBulkDelete(from, until),
  });
  const confirmBulkDeleteMutation = useMutation({
    mutationFn: ({ from, until }: { from: string; until: string }) =>
      confirmBulkDelete(from, until),
  });
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [isDeletePreviousOpen, setIsDeletePreviousOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [deletePreviousFrom, setDeletePreviousFrom] = useState('');
  const [deletePreviousUntil, setDeletePreviousUntil] = useState(yesterdayKey);
  const [bulkPreview, setBulkPreview] = useState<BulkDeletePreview | null>(null);

  const isSaving =
    removeMutation.isPending ||
    previewBulkDeleteMutation.isPending ||
    confirmBulkDeleteMutation.isPending;
  const canDeleteOrders = Boolean(session.authUser);

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
      isDeletePreviousOpen ||
      isLogoutConfirmOpen,
  );

  const orderToDelete = useMemo(
    () => data.orders.find((order) => order.id === deleteOrderId) ?? null,
    [data.orders, deleteOrderId],
  );
  const deletePreviousCount = useMemo(
    () =>
      data.orders.filter(
        (order) =>
          order.deliveryDate &&
          (!deletePreviousFrom || order.deliveryDate >= deletePreviousFrom) &&
          order.deliveryDate <= deletePreviousUntil,
      ).length,
    [data.orders, deletePreviousFrom, deletePreviousUntil],
  );

  async function handleLogout() {
    setAppError('');
    setAppSuccess('');
    try {
      await session.logout();
      filters.resetFilters();
      orderForm.closeModal();
      setDeleteOrderId(null);
      setIsDeletePreviousOpen(false);
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
      await queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] });
      setDeleteOrderId(null);
      setAppSuccess('Encomenda apagada com sucesso.');
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível apagar a encomenda.'));
    }
  }
  async function confirmDeletePreviousOrders() {
    setAppError('');
    setAppSuccess('');
    const request = {
      ...(deletePreviousFrom ? { from: deletePreviousFrom } : {}),
      until: deletePreviousUntil,
    };
    try {
      if (!bulkPreview) {
        setBulkPreview(
          await previewBulkDeleteMutation.mutateAsync({
            from: request.from ?? '',
            until: request.until,
          }),
        );
        return;
      }
      const result = await confirmBulkDeleteMutation.mutateAsync({
        from: request.from ?? '',
        until: request.until,
      });
      await queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] });
      setBulkPreview(null);
      setIsDeletePreviousOpen(false);
      setAppSuccess(
        `${result.deleted} ${
          result.deleted === 1 ? 'encomenda apagada' : 'encomendas apagadas'
        } com sucesso.`,
      );
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível excluir o período.'));
    }
  }
  function openDeletePreviousModal() {
    setDeletePreviousFrom('');
    setDeletePreviousUntil(yesterdayKey());
    setBulkPreview(null);
    setIsDeletePreviousOpen(true);
  }
  function changeDeletePreviousFrom(value: string) {
    setBulkPreview(null);
    setDeletePreviousFrom(value);
  }
  function changeDeletePreviousUntil(value: string) {
    setBulkPreview(null);
    setDeletePreviousUntil(value);
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
          userDisplayName={session.authUser.displayName}
          onLogoutRequest={() => setIsLogoutConfirmOpen(true)}
          onOpenSettings={() => navigate('/settings')}
        />
        {appSuccess && <Alert tone="success">{appSuccess}</Alert>}
        {visibleError && <Alert tone="error">{visibleError}</Alert>}
        <OrderIndicators
          stats={filters.stats}
          total={data.pagination.total}
          canDeletePrevious={canDeleteOrders && filters.stats.previous > 0}
          onDeletePrevious={openDeletePreviousModal}
        />
        <section className={styles.ordersPanel} aria-label="Encomendas">
          <OrderFilters
            categoryFilter={filters.categoryFilter}
            dateFilter={filters.dateFilter}
            isCategoryFilterOpen={filters.isCategoryFilterOpen}
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
            canDelete={canDeleteOrders}
            orders={filters.filteredOrders}
            getResponsibleName={filters.getResponsibleName}
            onDelete={setDeleteOrderId}
            onEdit={orderForm.editOrder}
            onPrint={print.startPrint}
          />
          <OrdersPagination
            page={data.pagination.page}
            pageSize={data.pagination.pageSize}
            total={data.pagination.total}
            onPageChange={filterState.setPage}
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
      {isDeletePreviousOpen && (
        <DeletePreviousOrdersDialog
          count={bulkPreview?.total ?? deletePreviousCount}
          from={deletePreviousFrom}
          isPreviewed={Boolean(bulkPreview)}
          isSaving={isSaving}
          until={deletePreviousUntil}
          onCancel={() => {
            setBulkPreview(null);
            setIsDeletePreviousOpen(false);
          }}
          onConfirm={confirmDeletePreviousOrders}
          onFromChange={changeDeletePreviousFrom}
          onUntilChange={changeDeletePreviousUntil}
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
