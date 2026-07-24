import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { formatDate, todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order } from '../../../shared/lib/domain';
import {
  buildPrintProductSummary,
  type PrintProductSummary,
} from '../../../shared/lib/productGrouping';
import { listAllOrders } from '../../../shared/lib/supabaseData';

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
  const report = useQuery({
    queryKey: ['supabase', 'print-report', request, categoryFilter],
    queryFn: () =>
      listAllOrders({
        from: request?.from,
        until: request?.until,
        ...(categoryFilter !== 'Todas' ? { category: categoryFilter } : {}),
      }),
    enabled: Boolean(request),
    retry: false,
    staleTime: 0,
  });

  const printOrders = useMemo(() => {
    const orders = report.data ?? [];
    return request?.orderId ? orders.filter((order) => order.id === request.orderId) : orders;
  }, [report.data, request?.orderId]);
  const printProductSummary = useMemo<PrintProductSummary>(
    () => buildPrintProductSummary(printOrders),
    [printOrders],
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

  const isPreparingPrint = Boolean(request) && report.isFetching;
  const printError = report.error instanceof Error ? report.error.message : '';

  useEffect(() => {
    if (!request || isPreparingPrint || printError || !report.data) return;
    const timer = window.setTimeout(() => {
      window.print();
      setRequest(null);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isPreparingPrint, printError, report.data, request]);

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
    printOrderCount: printOrders.length,
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
