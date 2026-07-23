import type { OrdersControllerListParams } from '@order-manager/api-client';
import { useCallback, useMemo, useState } from 'react';

import { todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order, OrderResponsible } from '../../../shared/lib/domain';
import { categoryToApi } from '../lib/apiMappers';

export type OrderFilterState = ReturnType<typeof useOrderFilterState>;

export function useOrderFilterState() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(todayKey());
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | Category>('Todas');
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const queryParams = useMemo<OrdersControllerListParams>(
    () => ({
      ...(dateFilter ? { from: dateFilter, until: dateFilter } : {}),
      ...(categoryToApi(categoryFilter) ? { category: categoryToApi(categoryFilter) } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      page,
      pageSize,
    }),
    [categoryFilter, dateFilter, page, pageSize, search],
  );

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const changeDateFilter = useCallback((value: string) => {
    setDateFilter(value);
    setPage(1);
  }, []);
  const changeCategoryFilter = useCallback((value: 'Todas' | Category) => {
    setCategoryFilter(value);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setDateFilter(todayKey());
    setCategoryFilter('Todas');
    setIsCategoryFilterOpen(false);
    setPage(1);
  }, []);

  return {
    categoryFilter,
    dateFilter,
    isCategoryFilterOpen,
    page,
    pageSize,
    queryParams,
    resetFilters,
    search,
    setCategoryFilter: changeCategoryFilter,
    setDateFilter: changeDateFilter,
    setIsCategoryFilterOpen,
    setPage,
    setSearch: changeSearch,
  };
}

export function useOrderFilters(
  orders: Order[],
  responsibles: OrderResponsible[],
  state: OrderFilterState,
) {
  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) =>
        `${a.deliveryDate} ${a.deliveryTime}`.localeCompare(`${b.deliveryDate} ${b.deliveryTime}`),
      ),
    [orders],
  );

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

  return {
    ...state,
    filteredOrders: sortedOrders,
    getResponsibleName,
    sortedOrders,
    stats,
  };
}
