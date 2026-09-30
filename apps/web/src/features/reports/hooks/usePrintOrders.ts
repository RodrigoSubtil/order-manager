import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatDate, todayKey } from '../../../shared/lib/dateUtils';
import type { Category, Order } from '../../../shared/lib/domain';
import {
  buildPrintProductSummary,
  type PrintProductSummary,
} from '../../../shared/lib/productGrouping';
import { listAllOrders } from '../../../shared/lib/supabaseData';
import { preparePrintFrame } from '../lib/preparePrintFrame';

export type PrintMode = 'orders' | 'summary';
export type PrintRangeMode = 'day' | 'period';
export type PrintCategory = Category | 'Todas';

type PrintRequest = {
  from: string;
  fromTime: string;
  until: string;
  untilTime: string;
  category: PrintCategory;
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

export function filterOrdersByCategory(orders: Order[], category: PrintCategory) {
  if (category === 'Todas') return orders;

  return orders
    .map((order) => ({
      ...order,
      products: order.products.filter((product) => product.category === category),
    }))
    .filter((order) => order.products.length > 0);
}

export function usePrintOrders(
  currentOrders: Order[],
  dateFilter: string,
  categoryFilter: Category | 'Todas',
) {
  const [printAll, setPrintAll] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('orders');
  const [printCategory, setPrintCategory] = useState<PrintCategory>(categoryFilter);
  const [printFrom, setPrintFrom] = useState(todayKey());
  const [printUntil, setPrintUntil] = useState(todayKey());
  const [printFromTime, setPrintFromTime] = useState(startOfDay);
  const [printUntilTime, setPrintUntilTime] = useState(endOfDay);
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [request, setRequest] = useState<PrintRequest | null>(null);
  const [printLayoutError, setPrintLayoutError] = useState('');
  const startedRequest = useRef<PrintRequest | null>(null);
  const cleanUpPrint = useRef<() => void>(() => {});
  const activeFrame = useRef<HTMLIFrameElement | null>(null);
  const printRangeMode: PrintRangeMode = printFrom === printUntil ? 'day' : 'period';
  const loadPrintOrders = (from: string, until: string, category: PrintCategory) => {
    const params = {
      from,
      until,
      ...(category !== 'Todas' ? { category } : {}),
    };
    return listAllOrders(params);
  };
  const printOptionsReport = useQuery({
    queryKey: ['supabase', 'print-options-preview', printFrom, printUntil, printCategory],
    queryFn: () => loadPrintOrders(printFrom, printUntil, printCategory),
    enabled:
      isPrintOptionsOpen &&
      Boolean(printFrom) &&
      isValidDateTimeRange(printFrom, printFromTime, printUntil, printUntilTime),
    retry: false,
    staleTime: 0,
  });
  const report = useQuery({
    queryKey: ['supabase', 'print-report', request],
    queryFn: () =>
      loadPrintOrders(request?.from ?? '', request?.until ?? '', request?.category ?? 'Todas'),
    enabled: Boolean(request),
    retry: false,
    staleTime: 0,
  });

  const printOrders = useMemo(() => {
    const orders = request
      ? filterOrdersByCategory(
          filterOrdersByDateTime(
            report.data ?? [],
            request.from,
            request.fromTime,
            request.until,
            request.untilTime,
          ),
          request.category,
        )
      : [];
    return request?.orderId ? orders.filter((order) => order.id === request.orderId) : orders;
  }, [report.data, request]);
  const printOptionsOrderCount = useMemo(
    () =>
      filterOrdersByCategory(
        filterOrdersByDateTime(
          printOptionsReport.data ?? [],
          printFrom,
          printFromTime,
          printUntil,
          printUntilTime,
        ),
        printCategory,
      ).length,
    [printCategory, printFrom, printFromTime, printOptionsReport.data, printUntil, printUntilTime],
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
    const category = printCategory === 'Todas' ? 'Todas as áreas' : printCategory;
    return printMode === 'summary'
      ? `Resumo de produção - ${period} · ${category}`
      : `Encomendas detalhadas - ${period} · ${category}`;
  }, [
    printAll,
    printCategory,
    printFrom,
    printFromTime,
    printMode,
    printRangeMode,
    printUntil,
    printUntilTime,
  ]);

  const isPreparingPrint = Boolean(request) && report.isFetching;
  const isPreparingPrintOptions = isPrintOptionsOpen && printOptionsReport.isFetching;
  const printError =
    printLayoutError ||
    (report.error instanceof Error
      ? report.error.message
      : request && !report.isFetching && report.data && printOrders.length === 0
        ? 'Nenhuma encomenda encontrada para esta impressão. Atualize os filtros e tente novamente.'
        : '');
  const printOptionsError =
    printOptionsReport.error instanceof Error ? printOptionsReport.error.message : '';

  useEffect(
    () => () => {
      cleanUpPrint.current();
      activeFrame.current?.remove();
    },
    [],
  );

  useEffect(() => {
    if (!request || isPreparingPrint || printError || !report.data) return;
    if (startedRequest.current === request) return;
    cleanUpPrint.current();
    activeFrame.current?.remove();
    activeFrame.current = null;
    startedRequest.current = request;

    let frame: HTMLIFrameElement | null = null;
    let cancelled = false;
    let finished = false;
    const finishPrint = () => {
      if (finished) return;
      finished = true;
      cleanUpPrint.current();
      startedRequest.current = null;
      setRequest(null);
    };
    window.addEventListener('afterprint', finishPrint, { once: true });
    const timer = window.setTimeout(async () => {
      try {
        const root = document.querySelector<HTMLElement>('[data-print-root]');
        if (!root) throw new Error('Não foi possível preparar a impressão. Tente novamente.');
        frame = await preparePrintFrame(root);
        if (cancelled) {
          frame.remove();
          return;
        }
        activeFrame.current = frame;
        const printWindow = frame.contentWindow;
        if (!printWindow) throw new Error('Não foi possível abrir a prévia de impressão.');
        printWindow.addEventListener('afterprint', finishPrint, { once: true });
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        frame?.remove();
        setPrintLayoutError(
          error instanceof Error ? error.message : 'Falha ao preparar a impressão.',
        );
        finishPrint();
      }
    }, 120);
    cleanUpPrint.current = () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finishPrint);
      frame?.contentWindow?.removeEventListener('afterprint', finishPrint);
    };
  }, [isPreparingPrint, printError, report.data, request]);

  function openPrintOptions() {
    setPrintLayoutError('');
    const initialDate = todayKey();
    setPrintMode('orders');
    setPrintCategory(categoryFilter);
    setPrintFrom(initialDate);
    setPrintUntil(initialDate);
    setPrintFromTime(startOfDay);
    setPrintUntilTime(endOfDay);
    setPrintAll(true);
    setIsPrintOptionsOpen(true);
  }
  function confirmPrintOptions() {
    if (
      !printFrom ||
      !printUntil ||
      !isValidDateTimeRange(printFrom, printFromTime, printUntil, printUntilTime) ||
      !printOptionsOrderCount
    ) {
      return;
    }
    setPrintAll(true);
    setPrintLayoutError('');
    setIsPrintOptionsOpen(false);
    setRequest({
      from: printFrom,
      fromTime: printFromTime,
      until: printUntil,
      untilTime: printUntilTime,
      category: printCategory,
      mode: printMode,
      orderId: null,
    });
  }
  function startPrint(orderId?: string) {
    setPrintLayoutError('');
    const order = currentOrders.find((item) => item.id === orderId);
    const date = order?.deliveryDate ?? (dateFilter || todayKey());
    setPrintMode('orders');
    setPrintCategory('Todas');
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
      category: 'Todas',
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
    printCategory,
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
    setPrintCategory,
    setPrintFrom,
    setPrintFromTime,
    setPrintMode,
    setPrintUntil,
    setPrintUntilTime,
    startPrint,
  };
}
