import {
  useReportsControllerDetailed,
  useReportsControllerProductionSummary,
  getReportsControllerDetailedQueryKey,
  getReportsControllerProductionSummaryQueryKey,
  type ProductCategory,
} from '@order-manager/api-client';
import { useEffect, useMemo, useState } from 'react';

import { getApiErrorMessage } from '../../../shared/lib/apiError';
import { formatDate, todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order } from '../../../shared/lib/domain';
import type { PrintProductSummary } from '../../../shared/lib/productGrouping';
import {
  categoryToApi,
  orderFromDetailedReport,
  summaryFromApi,
} from '../../orders/lib/apiMappers';

export type PrintMode = 'orders' | 'summary';
export type PrintRangeMode = 'day' | 'period';

type PrintRequest = {
  from: string;
  until: string;
  mode: PrintMode;
  orderId: string | null;
};

export function usePrintOrders(
  currentOrders: Order[],
  dateFilter: string,
  categoryFilter: Category | 'Todas',
) {
  const [printAll, setPrintAll] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('orders');
  const [printRangeMode, setPrintRangeMode] = useState<PrintRangeMode>('day');
  const [printFrom, setPrintFrom] = useState(todayKey());
  const [printUntil, setPrintUntil] = useState(todayKey());
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [request, setRequest] = useState<PrintRequest | null>(null);
  const category = categoryToApi(categoryFilter) as ProductCategory | undefined;
  const reportParams = request
    ? { from: request.from, until: request.until, ...(category ? { category } : {}) }
    : { from: todayKey(), until: todayKey(), ...(category ? { category } : {}) };
  const detailedQuery = useReportsControllerDetailed(reportParams, {
    query: {
      queryKey: getReportsControllerDetailedQueryKey(reportParams),
      enabled: Boolean(request),
      retry: false,
      staleTime: 0,
    },
  });
  const summaryQuery = useReportsControllerProductionSummary(reportParams, {
    query: {
      queryKey: getReportsControllerProductionSummaryQueryKey(reportParams),
      enabled: Boolean(request) && request?.mode === 'summary',
      retry: false,
      staleTime: 0,
    },
  });

  const printOrders = useMemo(() => {
    const orders = (detailedQuery.data?.orders ?? []).map(orderFromDetailedReport);
    return request?.orderId ? orders.filter((order) => order.id === request.orderId) : orders;
  }, [detailedQuery.data?.orders, request?.orderId]);
  const printProductSummary = useMemo<PrintProductSummary>(
    () => (summaryQuery.data ? summaryFromApi(summaryQuery.data) : []),
    [summaryQuery.data],
  );
  const printDescription = useMemo(() => {
    if (!printAll) return 'Ficha individual';
    const period =
      printRangeMode === 'day'
        ? formatDate(printFrom)
        : `${formatDate(printFrom)} até ${formatDate(printUntil)}`;
    return printMode === 'summary'
      ? `Resumo de produção - ${period}`
      : `Encomendas detalhadas - ${period}`;
  }, [printAll, printFrom, printMode, printRangeMode, printUntil]);

  const isPreparingPrint =
    Boolean(request) &&
    (detailedQuery.isFetching || (request?.mode === 'summary' && summaryQuery.isFetching));
  const printError = detailedQuery.error
    ? getApiErrorMessage(detailedQuery.error, 'Não foi possível preparar a impressão.')
    : summaryQuery.error
      ? getApiErrorMessage(summaryQuery.error, 'Não foi possível preparar o resumo de produção.')
      : '';

  useEffect(() => {
    if (!request || isPreparingPrint || printError) return;
    if (request.mode === 'orders' && !detailedQuery.data) return;
    if (request.mode === 'summary' && !summaryQuery.data) return;
    window.setTimeout(() => window.print(), 80);
    setRequest(null);
  }, [detailedQuery.data, isPreparingPrint, printError, request, summaryQuery.data]);

  function openPrintOptions() {
    const initialDate = dateFilter || todayKey();
    setPrintMode('orders');
    setPrintRangeMode('day');
    setPrintFrom(initialDate);
    setPrintUntil(initialDate);
    setPrintAll(true);
    setIsPrintOptionsOpen(true);
  }
  function confirmPrintOptions() {
    setPrintAll(true);
    setIsPrintOptionsOpen(false);
    setRequest({
      from: printFrom,
      until: printRangeMode === 'day' ? printFrom : printUntil,
      mode: printMode,
      orderId: null,
    });
  }
  function startPrint(orderId?: string) {
    const order = currentOrders.find((item) => item.id === orderId);
    const date = order?.deliveryDate ?? (dateFilter || todayKey());
    setPrintMode('orders');
    setPrintAll(!orderId);
    setPrintFrom(date);
    setPrintUntil(date);
    setRequest({ from: date, until: date, mode: 'orders', orderId: orderId ?? null });
  }

  return {
    confirmPrintOptions,
    isPreparingPrint,
    isPrintOptionsOpen,
    openPrintOptions,
    printAll,
    printDescription,
    printError,
    printFrom,
    printMode,
    printOrderCount: summaryQuery.data?.orderCount ?? printOrders.length,
    printOrders,
    printProductSummary,
    printRangeMode,
    printUntil,
    setIsPrintOptionsOpen,
    setPrintFrom,
    setPrintMode,
    setPrintRangeMode,
    setPrintUntil,
    startPrint,
  };
}
