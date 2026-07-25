import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import {
  categories,
  type CatalogProduct,
  type Category,
  type Order,
} from '../../../shared/lib/domain';
import { recordRecoveryEvent } from '../../../shared/lib/recoveryArchive';
import { listAllOrders, saveOrder as saveOrderInSupabase } from '../../../shared/lib/supabaseData';
import { getFormSubmissionError } from '../lib/formSubmissionError';
import {
  createEmptyOrderFormValues,
  createEmptyOrderItem,
  formValuesToOrderForm,
  orderToFormValues,
} from '../lib/orderFormMappers';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';

type UseOrderFormOptions = {
  catalogProducts: CatalogProduct[];
  setAppError: Dispatch<SetStateAction<string>>;
  setAppSuccess: Dispatch<SetStateAction<string>>;
  tenantId: string;
};

type SavedOrderConfirmation = {
  deliveryDate: string;
  message: string;
};

export function useOrderForm({
  catalogProducts,
  setAppError,
  setAppSuccess,
  tenantId,
}: UseOrderFormOptions) {
  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: ({
      form,
      current,
    }: {
      form: ReturnType<typeof formValuesToOrderForm>;
      current?: Order;
    }) => saveOrderInSupabase(form, current),
  });
  const methods = useForm<OrderFormValues>({
    defaultValues: createEmptyOrderFormValues(),
    resolver: zodResolver(orderSchema),
    shouldFocusError: true,
  });
  const {
    append,
    fields: itemFields,
    remove,
    replace,
  } = useFieldArray({ control: methods.control, keyName: 'fieldKey', name: 'items' });
  const [openProductPickerId, setOpenProductPickerId] = useState<string | null>(null);
  const [openCategoryPickerId, setOpenCategoryPickerId] = useState<string | null>(null);
  const [openUnitPickerId, setOpenUnitPickerId] = useState<string | null>(null);
  const [isResponsiblePickerOpen, setIsResponsiblePickerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedOrderConfirmation, setSavedOrderConfirmation] =
    useState<SavedOrderConfirmation | null>(null);

  const catalogProductsByCategory = useMemo(() => {
    const productMap = new Map<Category, CatalogProduct[]>();
    categories.forEach((category) => productMap.set(category, []));
    catalogProducts.forEach((product) => productMap.get(product.category)?.push(product));
    return productMap;
  }, [catalogProducts]);
  function closeProductPickers() {
    setOpenProductPickerId(null);
    setOpenCategoryPickerId(null);
    setOpenUnitPickerId(null);
  }
  function closePickers() {
    closeProductPickers();
    setIsResponsiblePickerOpen(false);
  }
  function addProductLine() {
    append(createEmptyOrderItem(methods.getValues('items').at(-1)?.category));
  }
  function removeProductLine(index: number) {
    if (itemFields.length === 1) replace([createEmptyOrderItem()]);
    else remove(index);
  }
  function openNewOrderModal() {
    methods.reset(createEmptyOrderFormValues());
    setEditingOrder(null);
    setAppError('');
    setAppSuccess('');
    setSavedOrderConfirmation(null);
    closePickers();
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
    methods.reset(createEmptyOrderFormValues());
    setEditingOrder(null);
    setSavedOrderConfirmation(null);
    closePickers();
  }
  function editOrder(order: Order) {
    methods.reset(orderToFormValues(order));
    setEditingOrder(order);
    setAppError('');
    setAppSuccess('');
    setSavedOrderConfirmation(null);
    closePickers();
    setIsModalOpen(true);
  }

  const saveOrder = methods.handleSubmit(
    async (values) => {
      methods.clearErrors('root');
      setAppError('');
      setAppSuccess('');
      try {
        const form = formValuesToOrderForm(values);
        let savedOrder: { id: string; version: number };
        if (editingOrder) {
          if (!editingOrder.version)
            throw new Error('A versão da encomenda não está disponível. Recarregue os dados.');
          savedOrder = await saveMutation.mutateAsync({ form, current: editingOrder });
        } else {
          savedOrder = await saveMutation.mutateAsync({ form });
        }
        let recoveryAfter: unknown = {
          ...form,
          id: savedOrder.id,
          version: savedOrder.version,
        };
        try {
          const persistedOrder = (await listAllOrders({})).find(
            (order) => order.id === savedOrder.id,
          );
          if (persistedOrder) recoveryAfter = persistedOrder;
        } catch {
          // The mutation already succeeded; the form still provides a recoverable payload.
        }
        try {
          await recordRecoveryEvent(tenantId, {
            resource: 'order',
            action: editingOrder ? 'updated' : 'created',
            resourceId: savedOrder.id,
            ...(editingOrder ? { before: editingOrder } : {}),
            after: recoveryAfter,
          });
          await queryClient.invalidateQueries({
            queryKey: ['recovery-archive', tenantId],
          });
        } catch {
          setAppError(
            'A encomenda foi gravada, mas não foi possível atualizar o arquivo de recuperação deste dispositivo.',
          );
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] }),
          queryClient.invalidateQueries({ queryKey: ['supabase', 'contingency-snapshot'] }),
        ]);
        setSavedOrderConfirmation({
          deliveryDate: values.deliveryDate,
          message: editingOrder
            ? 'Encomenda atualizada com sucesso.'
            : 'Encomenda criada com sucesso.',
        });
      } catch (error) {
        const submissionError = getFormSubmissionError(
          error,
          'Não foi possível guardar a encomenda.',
        );
        if (submissionError.conflict)
          await queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] });
        methods.setError(submissionError.conflict ? 'root.conflict' : 'root.api', {
          message: submissionError.message,
        });
        setAppError(submissionError.message);
      }
    },
    () => {
      methods.setError('root.validation', {
        message:
          'Existem informações obrigatórias por preencher. Reveja os campos assinalados abaixo.',
      });
    },
  );

  async function returnToOrders() {
    if (!savedOrderConfirmation) return;
    const confirmation = savedOrderConfirmation;
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['supabase', 'contingency-snapshot'] }),
      ]);
      setAppError('');
      setAppSuccess(confirmation.message);
    } catch {
      setAppSuccess('');
      setAppError(
        'A encomenda foi gravada, mas não foi possível atualizar a lista. Atualize a página e tente novamente.',
      );
    } finally {
      closeModal();
    }
  }

  return {
    addProductLine,
    catalogProductsByCategory,
    closeModal,
    closePickers,
    editOrder,
    editingId: editingOrder?.id ?? null,
    isModalOpen,
    isResponsiblePickerOpen,
    itemFields,
    methods,
    openCategoryPickerId,
    openNewOrderModal,
    openProductPickerId,
    openUnitPickerId,
    removeProductLine,
    returnToOrders,
    saveOrder,
    savedOrderMessage: savedOrderConfirmation?.message ?? '',
    setIsModalOpen,
    setIsResponsiblePickerOpen,
    setOpenCategoryPickerId,
    setOpenProductPickerId,
    setOpenUnitPickerId,
  };
}
