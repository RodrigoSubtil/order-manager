import { useOrdersControllerCreate, useOrdersControllerUpdate } from '@order-manager/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import {
  categories,
  type CatalogProduct,
  type Category,
  type Order,
  type OrderResponsible,
} from '../../../shared/lib/domain';
import { createOrderFromForm, updateOrderFromForm } from '../lib/apiMappers';
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
  responsibles: OrderResponsible[];
  setAppError: Dispatch<SetStateAction<string>>;
};

export function useOrderForm({ catalogProducts, responsibles, setAppError }: UseOrderFormOptions) {
  const queryClient = useQueryClient();
  const createMutation = useOrdersControllerCreate();
  const updateMutation = useOrdersControllerUpdate();
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
  const responsibleName = useWatch({ control: methods.control, name: 'responsibleName' });
  const [openProductPickerId, setOpenProductPickerId] = useState<string | null>(null);
  const [openCategoryPickerId, setOpenCategoryPickerId] = useState<string | null>(null);
  const [openUnitPickerId, setOpenUnitPickerId] = useState<string | null>(null);
  const [isResponsiblePickerOpen, setIsResponsiblePickerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const catalogProductsByCategory = useMemo(() => {
    const productMap = new Map<Category, CatalogProduct[]>();
    categories.forEach((category) => productMap.set(category, []));
    catalogProducts.forEach((product) => productMap.get(product.category)?.push(product));
    return productMap;
  }, [catalogProducts]);
  const filteredResponsibles = useMemo(() => {
    const term = responsibleName.trim().toLowerCase();
    if (!term) return responsibles;
    return responsibles.filter((responsible) => responsible.name.toLowerCase().includes(term));
  }, [responsibleName, responsibles]);

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
    closePickers();
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
    methods.reset(createEmptyOrderFormValues());
    setEditingOrder(null);
    closePickers();
  }
  function editOrder(order: Order) {
    methods.reset(orderToFormValues(order));
    setEditingOrder(order);
    setAppError('');
    closePickers();
    setIsModalOpen(true);
  }

  const saveOrder = methods.handleSubmit(async (values) => {
    methods.clearErrors('root');
    setAppError('');
    try {
      const form = formValuesToOrderForm(values);
      if (editingOrder) {
        if (!editingOrder.version)
          throw new Error('A versão da encomenda não está disponível. Recarregue os dados.');
        await updateMutation.mutateAsync({
          id: editingOrder.id,
          data: updateOrderFromForm(form, editingOrder.version),
        });
      } else {
        await createMutation.mutateAsync({ data: createOrderFromForm(form) });
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      closeModal();
    } catch (error) {
      const submissionError = getFormSubmissionError(
        error,
        'Não foi possível guardar a encomenda.',
      );
      if (submissionError.conflict)
        await queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      methods.setError(submissionError.conflict ? 'root.conflict' : 'root.api', {
        message: submissionError.message,
      });
      setAppError(submissionError.message);
    }
  });

  return {
    addProductLine,
    catalogProductsByCategory,
    closeModal,
    closePickers,
    editOrder,
    editingId: editingOrder?.id ?? null,
    filteredResponsibles,
    isModalOpen,
    isResponsiblePickerOpen,
    itemFields,
    methods,
    openCategoryPickerId,
    openNewOrderModal,
    openProductPickerId,
    openUnitPickerId,
    removeProductLine,
    saveOrder,
    setIsModalOpen,
    setIsResponsiblePickerOpen,
    setOpenCategoryPickerId,
    setOpenProductPickerId,
    setOpenUnitPickerId,
  };
}
