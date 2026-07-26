import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  listAllOrders,
  listCatalogProducts,
  listResponsibles,
  type OrderListParams,
} from '../../../shared/lib/supabaseData';

export function useApiOrderData(params: OrderListParams, enabled: boolean) {
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
  const overviewQuery = useQuery({
    queryKey: ['supabase', 'orders-overview'],
    queryFn: () => listAllOrders({}),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const appError = useMemo(() => {
    const error =
      ordersQuery.error || overviewQuery.error || catalogQuery.error || responsiblesQuery.error;
    return error instanceof Error ? error.message : '';
  }, [catalogQuery.error, ordersQuery.error, overviewQuery.error, responsiblesQuery.error]);

  return {
    appError,
    catalogProducts: catalogQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    orders: ordersQuery.data ?? [],
    overviewOrders: overviewQuery.data ?? [],
    resultTotal: ordersQuery.data?.length ?? 0,
    responsibles: responsiblesQuery.data ?? [],
  };
}
