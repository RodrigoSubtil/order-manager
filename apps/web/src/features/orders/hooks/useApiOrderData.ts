import {
  useCatalogControllerList,
  useOrdersControllerList,
  useResponsiblesControllerList,
  getCatalogControllerListQueryKey,
  getOrdersControllerListQueryKey,
  getResponsiblesControllerListQueryKey,
  type OrdersControllerListParams,
} from '@order-manager/api-client';
import { useCallback, useMemo } from 'react';

import { getApiErrorMessage } from '../../../shared/lib/apiError';
import { catalogProductFromApi, orderFromApi, responsibleFromApi } from '../lib/apiMappers';

export function useApiOrderData(params: OrdersControllerListParams, enabled: boolean) {
  const ordersQuery = useOrdersControllerList(params, {
    query: {
      queryKey: getOrdersControllerListQueryKey(params),
      enabled,
      placeholderData: (previous) => previous,
      retry: false,
    },
  });
  const catalogQuery = useCatalogControllerList(
    { page: 1, pageSize: 100, active: true },
    {
      query: {
        queryKey: getCatalogControllerListQueryKey({ page: 1, pageSize: 100, active: true }),
        enabled,
        staleTime: 5 * 60_000,
        retry: false,
      },
    },
  );
  const responsiblesQuery = useResponsiblesControllerList(
    { page: 1, pageSize: 100, active: true },
    {
      query: {
        queryKey: getResponsiblesControllerListQueryKey({ page: 1, pageSize: 100, active: true }),
        enabled,
        staleTime: 5 * 60_000,
        retry: false,
      },
    },
  );

  const appError = useMemo(() => {
    if (ordersQuery.error)
      return getApiErrorMessage(ordersQuery.error, 'Não foi possível carregar as encomendas.');
    if (catalogQuery.error)
      return getApiErrorMessage(catalogQuery.error, 'Não foi possível carregar o catálogo.');
    if (responsiblesQuery.error)
      return getApiErrorMessage(
        responsiblesQuery.error,
        'Não foi possível carregar os responsáveis.',
      );
    return '';
  }, [catalogQuery.error, ordersQuery.error, responsiblesQuery.error]);

  const reloadOrders = useCallback(async () => {
    await ordersQuery.refetch({ throwOnError: true });
  }, [ordersQuery]);

  return {
    appError,
    catalogProducts: (catalogQuery.data?.items ?? []).map(catalogProductFromApi),
    clearData: () => undefined,
    isLoading: ordersQuery.isLoading,
    loadOrders: reloadOrders,
    orders: (ordersQuery.data?.items ?? []).map(orderFromApi),
    pagination: {
      page: ordersQuery.data?.page ?? params.page ?? 1,
      pageSize: ordersQuery.data?.pageSize ?? params.pageSize ?? 25,
      total: ordersQuery.data?.total ?? 0,
    },
    responsibles: (responsiblesQuery.data?.items ?? []).map(responsibleFromApi),
  };
}
