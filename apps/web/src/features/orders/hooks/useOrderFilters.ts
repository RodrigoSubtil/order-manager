import { useCallback, useMemo, useState } from 'react';

import { compareOrdersByDelivery } from '../../../shared/lib/contingencyStore';
import { todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order, OrderResponsible } from '../../../shared/lib/domain';
import type { OrderListParams } from '../../../shared/lib/supabaseData';

export type OrderFilterState = ReturnType<typeof useOrderFilterState>;

export { compareOrdersByDelivery } from '../../../shared/lib/contingencyStore';

export function getOrderStats(orders: Order[], today = todayKey()) {
  return orders.reduce(
    (acc, order) => {
      if (order.deliveryDate === today) acc.today += 1;
      if (order.deliveryDate > today) acc.upcoming += 1;
      return acc;
    },
    { today: 0, upcoming: 0 },
  );
}

export function useOrderFilterState() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(todayKey());
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | Category>('Todas');
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);

  const queryParams = useMemo<OrderListParams>(
    () => ({
      ...(dateFilter ? { from: dateFilter, until: dateFilter } : {}),
      ...(categoryFilter !== 'Todas' ? { category: categoryFilter } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      page: 1,
      pageSize: 100,
    }),
    [categoryFilter, dateFilter, search],
  );

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);
  const changeDateFilter = useCallback((value: string) => {
    setDateFilter(value);
  }, []);
  const changeCategoryFilter = useCallback((value: 'Todas' | Category) => {
    setCategoryFilter(value);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setDateFilter(todayKey());
    setCategoryFilter('Todas');
    setIsCategoryFilterOpen(false);
  }, []);

  return {
    categoryFilter,
    dateFilter,
    isCategoryFilterOpen,
    queryParams,
    resetFilters,
    search,
    setCategoryFilter: changeCategoryFilter,
    setDateFilter: changeDateFilter,
    setIsCategoryFilterOpen,
    setSearch: changeSearch,
  };
}

export function useOrderFilters(
  orders: Order[],
  overviewOrders: Order[],
  responsibles: OrderResponsible[],
  state: OrderFilterState,
) {
  const sortedOrders = useMemo(() => [...orders].sort(compareOrdersByDelivery), [orders]);

  const responsibleNamesById = useMemo(
    () => new Map(responsibles.map((responsible) => [responsible.id, responsible.name])),
    [responsibles],
  );

  const getResponsibleName = useCallback(
    (order: Order) =>
      order.responsibleName || responsibleNamesById.get(order.responsibleId) || 'Não informado',
    [responsibleNamesById],
  );

  const stats = useMemo(() => {
    return getOrderStats(overviewOrders);
  }, [overviewOrders]);

  return {
    ...state,
    filteredOrders: sortedOrders,
    getResponsibleName,
    sortedOrders,
    stats,
  };
}
