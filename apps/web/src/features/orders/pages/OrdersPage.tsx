import {
  useOrdersControllerConfirmBulkDelete,
  useOrdersControllerPreviewBulkDelete,
  useOrdersControllerRemove,
  type BulkDeleteOrdersPreviewResponseDto,
} from '@order-manager/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LogoutConfirmDialog } from '../../auth/components/LogoutConfirmDialog';
import { SessionHeader } from '../../auth/components/SessionHeader';
import { TenantSelectorDialog } from '../../auth/components/TenantSelectorDialog';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import { TenantAccessPage } from '../../auth/pages/TenantAccessPage';
import { PrintOptionsDialog } from '../../reports/components/PrintOptionsDialog';
import { PrintableOrders } from '../../reports/components/PrintableOrders';
import { usePrintOrders } from '../../reports/hooks/usePrintOrders';
import { useModalBodyClass, useOutsidePointerDown } from '../../../shared/hooks';
import { Alert } from '../../../shared/components/ui';
import { getApiErrorMessage } from '../../../shared/lib/apiError';
import { yesterdayKey } from '../../../shared/lib/dateUtils';
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
  const data = useApiOrderData(
    filterState.queryParams,
    Boolean(session.authUser && !session.tenantSelectionRequired),
  );
  const filters = useOrderFilters(data.orders, data.responsibles, filterState);
  const [appError, setAppError] = useState('');
  const orderForm = useOrderForm({
    catalogProducts: data.catalogProducts,
    responsibles: data.responsibles,
    setAppError,
  });
  const print = usePrintOrders(filters.sortedOrders, filters.dateFilter, filters.categoryFilter);
  const removeMutation = useOrdersControllerRemove();
  const previewBulkDeleteMutation = useOrdersControllerPreviewBulkDelete();
  const confirmBulkDeleteMutation = useOrdersControllerConfirmBulkDelete();
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [isDeletePreviousOpen, setIsDeletePreviousOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isTenantSelectorOpen, setIsTenantSelectorOpen] = useState(false);
  const [deletePreviousFrom, setDeletePreviousFrom] = useState('');
  const [deletePreviousUntil, setDeletePreviousUntil] = useState(yesterdayKey);
  const [bulkPreview, setBulkPreview] = useState<BulkDeleteOrdersPreviewResponseDto | null>(null);

  const isSaving =
    removeMutation.isPending ||
    previewBulkDeleteMutation.isPending ||
    confirmBulkDeleteMutation.isPending;
  const canDeleteOrders = session.role === 'OWNER' || session.role === 'ADMIN';

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
      isLogoutConfirmOpen ||
      isTenantSelectorOpen,
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
  async function handleTenantSwitch(membershipId: string) {
    setAppError('');
    try {
      await session.switchTenant(membershipId);
      setIsTenantSelectorOpen(false);
      filterState.setPage(1);
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível trocar de empresa.'));
    }
  }
  async function handleInvitationAcceptance(membershipId: string) {
    setAppError('');
    try {
      await session.acceptInvitation(membershipId);
      filterState.setPage(1);
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível aceitar o convite.'));
    }
  }
  async function handleTenantCreation(name: string, slug: string) {
    setAppError('');
    try {
      await session.createTenant(name, slug);
      filterState.setPage(1);
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível criar a empresa.'));
    }
  }
  async function confirmDeleteOrder() {
    if (!orderToDelete?.version) {
      setAppError('A versão da encomenda não está disponível. Recarregue os dados.');
      return;
    }
    setAppError('');
    try {
      await removeMutation.mutateAsync({
        id: orderToDelete.id,
        params: { version: orderToDelete.version },
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      setDeleteOrderId(null);
    } catch (error) {
      setAppError(getApiErrorMessage(error, 'Não foi possível apagar a encomenda.'));
    }
  }
  async function confirmDeletePreviousOrders() {
    setAppError('');
    const request = {
      ...(deletePreviousFrom ? { from: deletePreviousFrom } : {}),
      until: deletePreviousUntil,
    };
    try {
      if (!bulkPreview) {
        setBulkPreview(
          await previewBulkDeleteMutation.mutateAsync({
            data: { ...request, confirmation: false },
          }),
        );
        return;
      }
      await confirmBulkDeleteMutation.mutateAsync({ data: { ...request, confirmation: true } });
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      setBulkPreview(null);
      setIsDeletePreviousOpen(false);
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
        onRequestPasswordRecovery={session.requestPasswordRecovery}
      />
    );
  }

  if (session.tenantSelectionRequired) {
    return (
      <TenantAccessPage
        error={appError || session.sessionError}
        isSaving={session.isTenantActionPending}
        memberships={session.memberships}
        onAcceptInvitation={handleInvitationAcceptance}
        onCreateTenant={handleTenantCreation}
        onSelectTenant={handleTenantSwitch}
      />
    );
  }

  const companyDisplayName = session.authUser.bakeryName || 'Empresa';
  const visibleError = appError || data.appError || print.printError;

  return (
    <>
      <main className={styles.shell} data-screen-only>
        <SessionHeader
          companyDisplayName={companyDisplayName}
          isAdmin={session.isAdmin}
          role={session.role ?? ''}
          userDisplayName={session.authUser.displayName}
          onLogoutRequest={() => setIsLogoutConfirmOpen(true)}
          onOpenSettings={() => navigate('/settings')}
          onOpenTenantSelector={() => setIsTenantSelectorOpen(true)}
        />
        {visibleError && <Alert tone="error">{visibleError}</Alert>}
        <OrderIndicators
          stats={filters.stats}
          total={data.pagination.total}
          canDeletePrevious={canDeleteOrders}
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
          filteredResponsibles={orderForm.filteredResponsibles}
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
          onSubmit={orderForm.saveOrder}
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
      {isTenantSelectorOpen && (
        <TenantSelectorDialog
          activeMembershipId={session.activeMembershipId}
          error={appError}
          isSaving={session.isTenantActionPending}
          memberships={session.memberships}
          onAcceptInvitation={(membershipId) => void handleInvitationAcceptance(membershipId)}
          onClose={() => setIsTenantSelectorOpen(false)}
          onSelect={(membershipId) => void handleTenantSwitch(membershipId)}
        />
      )}
      {print.isPrintOptionsOpen && (
        <PrintOptionsDialog
          isPreparing={print.isPreparingPrint}
          orderCount={filters.sortedOrders.length}
          printFrom={print.printFrom}
          printMode={print.printMode}
          printRangeMode={print.printRangeMode}
          printUntil={print.printUntil}
          onCancel={() => print.setIsPrintOptionsOpen(false)}
          onConfirm={print.confirmPrintOptions}
          onFromChange={print.setPrintFrom}
          onModeChange={print.setPrintMode}
          onRangeModeChange={print.setPrintRangeMode}
          onUntilChange={print.setPrintUntil}
        />
      )}
      <PrintableOrders
        getResponsibleName={filters.getResponsibleName}
        printAll={print.printAll}
        printDescription={print.printDescription}
        printFrom={print.printFrom}
        printMode={print.printMode}
        printOrderCount={print.printOrderCount}
        printOrders={print.printOrders}
        printProductSummary={print.printProductSummary}
        printRangeMode={print.printRangeMode}
        printUntil={print.printUntil}
      />
    </>
  );
}
