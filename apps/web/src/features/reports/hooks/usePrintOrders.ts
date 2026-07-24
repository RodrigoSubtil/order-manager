import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { formatDate, todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order } from '../../../shared/lib/domain';
import { filterContingencyOrders } from '../../../shared/lib/contingencyStore';
import {
  buildPrintProductSummary,
  type PrintProductSummary,
} from '../../../shared/lib/productGrouping';
import { listAllOrders } from '../../../shared/lib/supabaseData';

export type PrintMode = 'orders' | 'summary';
export type PrintRangeMode = 'day' | 'period';

type PrintRequest = {
  from: string;
  fromTime: string;
  until: string;
  untilTime: string;
  mode: PrintMode;
  orderId: string | null;
};

const startOfDay = '00:00';
const endOfDay = '23:59';

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidDateTimeRange(from: string, fromTime: string, until: string, untilTime: string) {
  return (
    Boolean(from && until) &&
    isValidTime(fromTime) &&
    isValidTime(untilTime) &&
    `${from}T${fromTime}` <= `${until}T${untilTime}`
  );
}

export function filterOrdersByDateTime(
  orders: Order[],
  from: string,
  fromTime: string,
  until: string,
  untilTime: string,
) {
  if (!isValidDateTimeRange(from, fromTime, until, untilTime)) return [];
  const start = `${from}T${fromTime}`;
  const end = `${until}T${untilTime}`;
  return orders.filter((order) => {
    const delivery = `${order.deliveryDate}T${order.deliveryTime}`;
    return delivery >= start && delivery <= end;
  });
}

export function usePrintOrders(
  currentOrders: Order[],
  dateFilter: string,
  categoryFilter: Category | 'Todas',
  contingencyOrders: Order[] | null = null,
) {
  const [printAll, setPrintAll] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('orders');
  const [printRangeMode, setPrintRangeMode] = useState<PrintRangeMode>('day');
  const [printFrom, setPrintFrom] = useState(todayKey());
  const [printUntil, setPrintUntil] = useState(todayKey());
  const [printFromTime, setPrintFromTime] = useState(startOfDay);
  const [printUntilTime, setPrintUntilTime] = useState(endOfDay);
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [request, setRequest] = useState<PrintRequest | null>(null);
  const optionsUntil = printRangeMode === 'day' ? printFrom : printUntil;
  const loadPrintOrders = (from: string, until: string) => {
    const params = {
      from,
      until,
      ...(categoryFilter !== 'Todas' ? { category: categoryFilter } : {}),
    };
    return contingencyOrders
      ? Promise.resolve(filterContingencyOrders(contingencyOrders, params))
      : listAllOrders(params);
  };
  const printOptionsReport = useQuery({
    queryKey: [
      'supabase',
      'print-options-preview',
      printFrom,
      optionsUntil,
      categoryFilter,
      Boolean(contingencyOrders),
    ],
    queryFn: () => loadPrintOrders(printFrom, optionsUntil),
    enabled:
      isPrintOptionsOpen &&
      Boolean(printFrom) &&
      Boolean(optionsUntil) &&
      optionsUntil >= printFrom &&
      isValidTime(printFromTime) &&
      isValidTime(printUntilTime),
    retry: false,
    staleTime: 0,
  });
  const report = useQuery({
    queryKey: ['supabase', 'print-report', request, categoryFilter, Boolean(contingencyOrders)],
    queryFn: () => loadPrintOrders(request?.from ?? '', request?.until ?? ''),
    enabled: Boolean(request),
    retry: false,
    staleTime: 0,
  });

  const printOrders = useMemo(() => {
    const orders = request
      ? filterOrdersByDateTime(
          report.data ?? [],
          request.from,
          request.fromTime,
          request.until,
          request.untilTime,
        )
      : [];
    return request?.orderId ? orders.filter((order) => order.id === request.orderId) : orders;
  }, [report.data, request]);
  const printOptionsOrderCount = useMemo(
    () =>
      filterOrdersByDateTime(
        printOptionsReport.data ?? [],
        printFrom,
        printFromTime,
        optionsUntil,
        printUntilTime,
      ).length,
    [optionsUntil, printFrom, printFromTime, printOptionsReport.data, printUntilTime],
  );
  const printProductSummary = useMemo<PrintProductSummary>(
    () => buildPrintProductSummary(printOrders),
    [printOrders],
  );
  const printDescription = useMemo(() => {
    if (!printAll) return 'Ficha individual';
    const period =
      printRangeMode === 'day'
        ? `${formatDate(printFrom)} · ${printFromTime}–${printUntilTime}`
        : `${formatDate(printFrom)} ${printFromTime} até ${formatDate(printUntil)} ${printUntilTime}`;
    return printMode === 'summary'
      ? `Resumo de produção - ${period}`
      : `Encomendas detalhadas - ${period}`;
  }, [printAll, printFrom, printFromTime, printMode, printRangeMode, printUntil, printUntilTime]);

  const isPreparingPrint = Boolean(request) && report.isFetching;
  const isPreparingPrintOptions = isPrintOptionsOpen && printOptionsReport.isFetching;
  const printError = report.error instanceof Error ? report.error.message : '';
  const printOptionsError =
    printOptionsReport.error instanceof Error ? printOptionsReport.error.message : '';

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
    setPrintFromTime(startOfDay);
    setPrintUntilTime(endOfDay);
    setPrintAll(true);
    setIsPrintOptionsOpen(true);
  }
  function confirmPrintOptions() {
    const until = printRangeMode === 'day' ? printFrom : printUntil;
    if (
      !printFrom ||
      !until ||
      !isValidDateTimeRange(printFrom, printFromTime, until, printUntilTime) ||
      !printOptionsOrderCount
    ) {
      return;
    }
    setPrintAll(true);
    setIsPrintOptionsOpen(false);
    setRequest({
      from: printFrom,
      fromTime: printFromTime,
      until,
      untilTime: printUntilTime,
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
    setPrintFromTime(startOfDay);
    setPrintUntilTime(endOfDay);
    setRequest({
      from: date,
      fromTime: startOfDay,
      until: date,
      untilTime: endOfDay,
      mode: 'orders',
      orderId: orderId ?? null,
    });
  }

  return {
    confirmPrintOptions,
    isPreparingPrint,
    isPreparingPrintOptions,
    isPrintOptionsOpen,
    openPrintOptions,
    printAll,
    printDescription,
    printError,
    printFrom,
    printFromTime,
    printMode,
    printOrderCount: printOrders.length,
    printOptionsError,
    printOptionsOrderCount,
    printOrders,
    printProductSummary,
    printRangeMode,
    printUntil,
    printUntilTime,
    setIsPrintOptionsOpen,
    setPrintFrom,
    setPrintFromTime,
    setPrintMode,
    setPrintRangeMode,
    setPrintUntil,
    setPrintUntilTime,
    startPrint,
  };
}
