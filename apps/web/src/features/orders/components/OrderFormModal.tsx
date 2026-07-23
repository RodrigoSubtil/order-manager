import type { Dispatch, SetStateAction } from 'react';
import { Controller, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';

import {
  Alert,
  Button,
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxOption,
  ComboboxTrigger,
  DatePicker,
  Dialog,
  FieldError,
  Input,
} from '../../../shared/components/ui';
import type { CatalogProduct, Category, OrderResponsible } from '../../../shared/lib/domain';
import type { OrderFormValues } from '../schemas/orderSchema';
import { ProductEditor } from './ProductEditor';
import styles from './OrderFormModal.module.css';

type OrderFormModalProps = {
  catalogProductsByCategory: Map<Category, CatalogProduct[]>;
  editingId: string | null;
  filteredResponsibles: OrderResponsible[];
  isResponsiblePickerOpen: boolean;
  itemFields: FieldArrayWithId<OrderFormValues, 'items', 'fieldKey'>[];
  methods: UseFormReturn<OrderFormValues>;
  openCategoryPickerId: string | null;
  openProductPickerId: string | null;
  openUnitPickerId: string | null;
  responsibles: OrderResponsible[];
  onAddProduct: () => void;
  onClose: () => void;
  onRemoveProduct: (index: number) => void;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  setIsResponsiblePickerOpen: Dispatch<SetStateAction<boolean>>;
  setOpenCategoryPickerId: Dispatch<SetStateAction<string | null>>;
  setOpenProductPickerId: Dispatch<SetStateAction<string | null>>;
  setOpenUnitPickerId: Dispatch<SetStateAction<string | null>>;
};

export function OrderFormModal(props: OrderFormModalProps) {
  const {
    catalogProductsByCategory,
    editingId,
    filteredResponsibles,
    isResponsiblePickerOpen,
    itemFields,
    methods,
    openCategoryPickerId,
    openProductPickerId,
    openUnitPickerId,
    responsibles,
    onAddProduct,
    onClose,
    onRemoveProduct,
    onSubmit,
    setIsResponsiblePickerOpen,
    setOpenCategoryPickerId,
    setOpenProductPickerId,
    setOpenUnitPickerId,
  } = props;
  const {
    control,
    formState: { errors, isSubmitted, isSubmitting },
    register,
    setValue,
  } = methods;
  const responsibleError = errors.responsibleId?.message || errors.responsibleName?.message;
  const submissionError = errors.root?.conflict?.message || errors.root?.api?.message;

  return (
    <Dialog className={styles.dialog} size="large" titleId="modal-title" onClose={onClose}>
      <form noValidate onSubmit={onSubmit}>
        <header className={styles.header}>
          <div>
            <span data-eyebrow>{editingId ? 'Editar pedido' : 'Novo pedido'}</span>
            <h2 id="modal-title">{editingId ? 'Editar encomenda' : 'Adicionar encomenda'}</h2>
          </div>
          <Button iconOnly variant="ghost" aria-label="Fechar" onClick={onClose}>
            ×
          </Button>
        </header>

        <div className={styles.body}>
          {submissionError && <Alert tone="error">{submissionError}</Alert>}

          <div className={styles.fieldGrid}>
            <div data-form-field>
              <label htmlFor="order-client-name">
                Nome do cliente
                <Input
                  id="order-client-name"
                  data-autofocus
                  {...register('clientName')}
                  aria-describedby={errors.clientName ? 'order-client-name-error' : undefined}
                  aria-invalid={Boolean(errors.clientName)}
                  placeholder="Ex.: Ana Silva"
                />
              </label>
              <FieldError id="order-client-name-error" message={errors.clientName?.message} />
            </div>
            <div data-form-field>
              <label htmlFor="order-phone">
                Telefone
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="order-phone"
                      aria-describedby={errors.phone ? 'order-phone-error' : undefined}
                      aria-invalid={Boolean(errors.phone)}
                      inputMode="numeric"
                      onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ''))}
                      placeholder="Ex.: 912000000"
                    />
                  )}
                />
              </label>
              <FieldError id="order-phone-error" message={errors.phone?.message} />
            </div>
            <div data-form-field>
              <label htmlFor="order-responsible">Responsável pela encomenda</label>
              <Combobox
                id="order-responsible"
                isOpen={isResponsiblePickerOpen}
                onOpenChange={setIsResponsiblePickerOpen}
              >
                <Controller
                  control={control}
                  name="responsibleName"
                  render={({ field }) => (
                    <ComboboxInput
                      {...field}
                      aria-describedby={responsibleError ? 'order-responsible-error' : undefined}
                      aria-invalid={Boolean(responsibleError)}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        const matchingResponsible = responsibles.find(
                          (responsible) =>
                            responsible.name.toLowerCase() === nextName.trim().toLowerCase(),
                        );
                        field.onChange(nextName);
                        setValue('responsibleId', matchingResponsible?.id ?? '', {
                          shouldDirty: true,
                          shouldValidate: isSubmitted,
                        });
                        setIsResponsiblePickerOpen(true);
                      }}
                      onFocus={() => setIsResponsiblePickerOpen(true)}
                      placeholder="Digite ou escolha o responsável"
                      autoComplete="off"
                    />
                  )}
                />
                <Input type="hidden" {...register('responsibleId')} />
                <ComboboxTrigger aria-label="Mostrar responsáveis" />
                <ComboboxList>
                  {filteredResponsibles.map((responsible) => (
                    <ComboboxOption
                      key={responsible.id}
                      aria-selected={methods.getValues('responsibleId') === responsible.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setValue('responsibleId', responsible.id, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        setValue('responsibleName', responsible.name, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        setIsResponsiblePickerOpen(false);
                      }}
                    >
                      {responsible.name}
                    </ComboboxOption>
                  ))}
                  {filteredResponsibles.length === 0 && (
                    <ComboboxEmpty>Nenhum responsável encontrado.</ComboboxEmpty>
                  )}
                </ComboboxList>
              </Combobox>
              <FieldError id="order-responsible-error" message={responsibleError} />
            </div>
            <div data-form-field>
              <label htmlFor="order-delivery-date">
                Data de entrega
                <Controller
                  control={control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <DatePicker
                      id="order-delivery-date"
                      className={styles.dateInput}
                      aria-describedby={
                        errors.deliveryDate ? 'order-delivery-date-error' : undefined
                      }
                      aria-invalid={Boolean(errors.deliveryDate)}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </label>
              <FieldError id="order-delivery-date-error" message={errors.deliveryDate?.message} />
            </div>
            <div data-form-field>
              <label htmlFor="order-delivery-time">
                Hora
                <div className={styles.dateControl}>
                  <Input
                    id="order-delivery-time"
                    className={styles.dateInput}
                    {...register('deliveryTime')}
                    aria-describedby={errors.deliveryTime ? 'order-delivery-time-error' : undefined}
                    aria-invalid={Boolean(errors.deliveryTime)}
                    type="time"
                  />
                  <span className={`${styles.dateIcon} ${styles.time}`} aria-hidden="true" />
                </div>
              </label>
              <FieldError id="order-delivery-time-error" message={errors.deliveryTime?.message} />
            </div>
          </div>

          <ProductEditor
            catalogProductsByCategory={catalogProductsByCategory}
            itemFields={itemFields}
            methods={methods}
            openCategoryPickerId={openCategoryPickerId}
            openProductPickerId={openProductPickerId}
            openUnitPickerId={openUnitPickerId}
            onAdd={onAddProduct}
            onRemove={onRemoveProduct}
            setOpenCategoryPickerId={setOpenCategoryPickerId}
            setOpenProductPickerId={setOpenProductPickerId}
            setOpenUnitPickerId={setOpenUnitPickerId}
          />
        </div>

        <footer className={styles.actions}>
          <Button disabled={isSubmitting} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A guardar...' : editingId ? 'Guardar alterações' : 'Guardar encomenda'}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
