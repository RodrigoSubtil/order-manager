import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  filterContingencyOrders,
  readContingencySnapshot,
  saveContingencySnapshot,
  type ContingencySnapshot,
} from '../../../shared/lib/contingencyStore';
import {
  listAllOrders,
  listCatalogProducts,
  listResponsibles,
  type OrderListParams,
} from '../../../shared/lib/supabaseData';

export function useApiOrderData(params: OrderListParams, enabled: boolean, tenantId: string) {
  const ordersQuery = useQuery({
    queryKey: ['supabase', 'orders', params],
    queryFn: () => listAllOrders(params),
    enabled,
    placeholderData: (previous) => previous,
    retry: false,
  });
  const catalogQuery = useQuery({
    queryKey: ['supabase', 'catalog'],
    queryFn: listCatalogProducts,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const responsiblesQuery = useQuery({
    queryKey: ['supabase', 'responsibles'],
    queryFn: listResponsibles,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const contingencyQuery = useQuery({
    queryKey: ['supabase', 'contingency-snapshot', tenantId],
    queryFn: async () => {
      const [orders, catalogProducts, responsibles] = await Promise.all([
        listAllOrders({}),
        listCatalogProducts(),
        listResponsibles(),
      ]);
      const snapshot: ContingencySnapshot = {
        version: 1,
        tenantId,
        savedAt: new Date().toISOString(),
        orders,
        catalogProducts,
        responsibles,
      };
      saveContingencySnapshot(snapshot);
      return snapshot;
    },
    enabled: enabled && Boolean(tenantId),
    staleTime: 60_000,
    retry: false,
  });
  const storedSnapshot = useMemo(
    () => contingencyQuery.data ?? readContingencySnapshot(tenantId),
    [contingencyQuery.data, tenantId],
  );
  const isContingencyMode = Boolean(
    storedSnapshot &&
    (ordersQuery.error || catalogQuery.error || responsiblesQuery.error || contingencyQuery.error),
  );
  const filteredContingencyOrders = useMemo(
    () => (storedSnapshot ? filterContingencyOrders(storedSnapshot.orders, params) : []),
    [params, storedSnapshot],
  );

  const appError = useMemo(() => {
    const error = ordersQuery.error || catalogQuery.error || responsiblesQuery.error;
    if (storedSnapshot && error) return '';
    return error instanceof Error ? error.message : '';
  }, [catalogQuery.error, ordersQuery.error, responsiblesQuery.error, storedSnapshot]);

  const loadOrders = useCallback(async () => {
    await ordersQuery.refetch({ throwOnError: true });
  }, [ordersQuery]);

  return {
    appError,
    catalogProducts:
      (isContingencyMode ? storedSnapshot?.catalogProducts : catalogQuery.data) ?? [],
    clearData: () => undefined,
    contingencyOrders: isContingencyMode ? (storedSnapshot?.orders ?? []) : null,
    contingencySavedAt: isContingencyMode ? (storedSnapshot?.savedAt ?? '') : '',
    isContingencyMode,
    isLoading: ordersQuery.isLoading && !isContingencyMode,
    loadOrders,
    orders: isContingencyMode ? filteredContingencyOrders : (ordersQuery.data ?? []),
    overviewOrders:
      (isContingencyMode ? storedSnapshot?.orders : contingencyQuery.data?.orders) ??
      storedSnapshot?.orders ??
      [],
    resultTotal: isContingencyMode
      ? filteredContingencyOrders.length
      : (ordersQuery.data?.length ?? 0),
    responsibles: (isContingencyMode ? storedSnapshot?.responsibles : responsiblesQuery.data) ?? [],
  };
}
