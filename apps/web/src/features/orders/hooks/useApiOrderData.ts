import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  listCatalogProducts,
  listOrders,
  listResponsibles,
  type OrderListParams,
} from '../../../shared/lib/supabaseData';

export function useApiOrderData(params: OrderListParams, enabled: boolean) {
  const ordersQuery = useQuery({
    queryKey: ['supabase', 'orders', params],
    queryFn: () => listOrders(params),
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

  const appError = useMemo(() => {
    const error = ordersQuery.error || catalogQuery.error || responsiblesQuery.error;
    return error instanceof Error ? error.message : '';
  }, [catalogQuery.error, ordersQuery.error, responsiblesQuery.error]);

  const loadOrders = useCallback(async () => {
    await ordersQuery.refetch({ throwOnError: true });
  }, [ordersQuery]);

  return {
    appError,
    catalogProducts: catalogQuery.data ?? [],
    clearData: () => undefined,
    isLoading: ordersQuery.isLoading,
    loadOrders,
    orders: ordersQuery.data?.items ?? [],
    pagination: {
      page: ordersQuery.data?.page ?? params.page,
      pageSize: ordersQuery.data?.pageSize ?? params.pageSize,
      total: ordersQuery.data?.total ?? 0,
    },
    responsibles: responsiblesQuery.data ?? [],
  };
}
