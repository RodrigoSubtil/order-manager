import { useCallback, useEffect, useMemo, useState } from 'react';

import { todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order, OrderResponsible } from '../../../shared/lib/domain';
import type { OrderListParams } from '../../../shared/lib/supabaseData';

export type OrderFilterState = ReturnType<typeof useOrderFilterState>;
export type DateFilterMode = 'all' | 'today' | 'custom';

export function compareOrdersByDelivery(first: Order, second: Order) {
  const dateTimeComparison = `${first.deliveryDate} ${first.deliveryTime}`.localeCompare(
    `${second.deliveryDate} ${second.deliveryTime}`,
  );
  if (dateTimeComparison !== 0) return dateTimeComparison;
  return (
    (first.orderNumber ?? Number.MAX_SAFE_INTEGER) - (second.orderNumber ?? Number.MAX_SAFE_INTEGER)
  );
}

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

export function useOrderFilterState(currentDay = todayKey()) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(todayKey());
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('today');
  const [customDate, setCustomDate] = useState(todayKey());
  const [hasCustomDate, setHasCustomDate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | Category>('Todas');
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);

  useEffect(() => {
    if (dateFilterMode === 'today') setDateFilter(currentDay);
  }, [currentDay, dateFilterMode]);

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
    setCustomDate(value);
    setHasCustomDate(Boolean(value));
    setDateFilter(value);
  }, []);
  const changeDateFilterMode = useCallback(
    (mode: DateFilterMode) => {
      setDateFilterMode(mode);
      setDateFilter(mode === 'all' ? '' : mode === 'today' ? todayKey() : customDate);
    },
    [customDate],
  );
  const changeCategoryFilter = useCallback((value: 'Todas' | Category) => {
    setCategoryFilter(value);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setDateFilter(todayKey());
    setDateFilterMode('today');
    setCustomDate(todayKey());
    setHasCustomDate(false);
    setCategoryFilter('Todas');
    setIsCategoryFilterOpen(false);
  }, []);

  return {
    categoryFilter,
    dateFilter,
    dateFilterMode,
    hasCustomDate,
    isCategoryFilterOpen,
    queryParams,
    resetFilters,
    search,
    setCategoryFilter: changeCategoryFilter,
    setDateFilter: changeDateFilter,
    setDateFilterMode: changeDateFilterMode,
    setIsCategoryFilterOpen,
    setSearch: changeSearch,
  };
}

export function useOrderFilters(
  orders: Order[],
  overviewOrders: Order[],
  responsibles: OrderResponsible[],
  state: OrderFilterState,
  currentDay = todayKey(),
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
    return getOrderStats(overviewOrders, currentDay);
  }, [overviewOrders, currentDay]);

  return {
    ...state,
    filteredOrders: sortedOrders,
    getResponsibleName,
    sortedOrders,
    stats,
  };
}
