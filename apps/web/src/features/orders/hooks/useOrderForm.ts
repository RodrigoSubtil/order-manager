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
import { saveOrder as saveOrderInSupabase } from '../../../shared/lib/supabaseData';
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
  onReturnToOrders: (deliveryDate: string) => void;
  setAppError: Dispatch<SetStateAction<string>>;
  setAppSuccess: Dispatch<SetStateAction<string>>;
};

type SavedOrderConfirmation = {
  deliveryDate: string;
  message: string;
};

export function useOrderForm({
  catalogProducts,
  onReturnToOrders,
  setAppError,
  setAppSuccess,
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
        if (editingOrder) {
          if (!editingOrder.version)
            throw new Error('A versão da encomenda não está disponível. Recarregue os dados.');
          await saveMutation.mutateAsync({ form, current: editingOrder });
        } else {
          await saveMutation.mutateAsync({ form });
        }
        await queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] });
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
    onReturnToOrders(confirmation.deliveryDate);
    try {
      await queryClient.invalidateQueries({ queryKey: ['supabase', 'orders'] });
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
