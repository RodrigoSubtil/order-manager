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
  SuccessMessage,
} from '../../../shared/components/ui';
import type { CatalogProduct, Category, OrderResponsible } from '../../../shared/lib/domain';
import { todayKey } from '../../../shared/lib/dateUtils';
import type { OrderFormValues } from '../schemas/orderSchema';
import { ProductEditor } from './ProductEditor';
import styles from './OrderFormModal.module.css';

type OrderFormModalProps = {
  catalogProductsByCategory: Map<Category, CatalogProduct[]>;
  editingId: string | null;
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
  onReturnToOrders: () => Promise<void>;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  savedOrderMessage: string;
  setIsResponsiblePickerOpen: Dispatch<SetStateAction<boolean>>;
  setOpenCategoryPickerId: Dispatch<SetStateAction<string | null>>;
  setOpenProductPickerId: Dispatch<SetStateAction<string | null>>;
  setOpenUnitPickerId: Dispatch<SetStateAction<string | null>>;
};

export function OrderFormModal(props: OrderFormModalProps) {
  const {
    catalogProductsByCategory,
    editingId,
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
    onReturnToOrders,
    onSubmit,
    savedOrderMessage,
    setIsResponsiblePickerOpen,
    setOpenCategoryPickerId,
    setOpenProductPickerId,
    setOpenUnitPickerId,
  } = props;
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setValue,
  } = methods;
  const responsibleError = errors.responsibleId?.message || errors.responsibleName?.message;
  const submissionError =
    errors.root?.validation?.message || errors.root?.conflict?.message || errors.root?.api?.message;
  const closeDialog = () => {
    if (savedOrderMessage) void onReturnToOrders();
    else onClose();
  };

  return (
    <Dialog className={styles.dialog} size="large" titleId="modal-title" onClose={closeDialog}>
      <form noValidate onSubmit={onSubmit}>
        <header className={styles.header}>
          <div>
            <span data-eyebrow>{editingId ? 'Editar pedido' : 'Novo pedido'}</span>
            <h2 id="modal-title">{editingId ? 'Editar encomenda' : 'Adicionar encomenda'}</h2>
          </div>
          <Button iconOnly variant="ghost" aria-label="Fechar" onClick={closeDialog}>
            ×
          </Button>
        </header>

        {savedOrderMessage ? (
          <SuccessMessage
            actionLabel="Voltar para as encomendas"
            description="A encomenda foi gravada corretamente e os dados serão atualizados no painel."
            onAction={() => void onReturnToOrders()}
            title={savedOrderMessage}
          />
        ) : (
          <>
            <div className={styles.body}>
              {submissionError && <Alert tone="error">{submissionError}</Alert>}

              <div className={styles.fieldGrid}>
                <div data-form-field>
                  <label htmlFor="order-client-name">
                    Nome do cliente
                    <Input
                      id="order-client-name"
                      data-autofocus
                      required
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
                          required
                          aria-describedby={errors.phone ? 'order-phone-error' : undefined}
                          aria-invalid={Boolean(errors.phone)}
                          inputMode="numeric"
                          onChange={(event) =>
                            field.onChange(event.target.value.replace(/\D/g, ''))
                          }
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
                          name={field.name}
                          ref={field.ref}
                          value={field.value}
                          required
                          readOnly
                          inputMode="none"
                          aria-describedby={
                            responsibleError ? 'order-responsible-error' : undefined
                          }
                          aria-invalid={Boolean(responsibleError)}
                          onBlur={field.onBlur}
                          onFocus={() => setIsResponsiblePickerOpen(true)}
                          onKeyDown={(event) => {
                            if (
                              event.key.length === 1 ||
                              event.key === 'Backspace' ||
                              event.key === 'Delete'
                            ) {
                              event.preventDefault();
                            }
                          }}
                          onPaste={(event) => event.preventDefault()}
                          onDrop={(event) => event.preventDefault()}
                          placeholder="Escolha o responsável"
                          autoComplete="off"
                        />
                      )}
                    />
                    <Input type="hidden" {...register('responsibleId')} />
                    <ComboboxTrigger aria-label="Mostrar responsáveis" />
                    <ComboboxList>
                      {responsibles.map((responsible) => (
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
                      {responsibles.length === 0 && (
                        <ComboboxEmpty>Nenhum responsável encontrado.</ComboboxEmpty>
                      )}
                    </ComboboxList>
                  </Combobox>
                  <FieldError id="order-responsible-error" message={responsibleError} />
                </div>
                <div data-form-field>
                  <label htmlFor="order-delivery-date">Data de entrega</label>
                  <Controller
                    control={control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <DatePicker
                        id="order-delivery-date"
                        className={styles.dateInput}
                        minDate={todayKey()}
                        required
                        aria-describedby={
                          errors.deliveryDate ? 'order-delivery-date-error' : undefined
                        }
                        aria-invalid={Boolean(errors.deliveryDate)}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldError
                    id="order-delivery-date-error"
                    message={errors.deliveryDate?.message}
                  />
                </div>
                <div data-form-field>
                  <label htmlFor="order-delivery-time">
                    Hora
                    <Input
                      id="order-delivery-time"
                      className={styles.dateInput}
                      required
                      {...register('deliveryTime')}
                      aria-describedby={
                        errors.deliveryTime ? 'order-delivery-time-error' : undefined
                      }
                      aria-invalid={Boolean(errors.deliveryTime)}
                      type="time"
                    />
                  </label>
                  <FieldError
                    id="order-delivery-time-error"
                    message={errors.deliveryTime?.message}
                  />
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
                {isSubmitting
                  ? 'A guardar...'
                  : editingId
                    ? 'Guardar alterações'
                    : 'Guardar encomenda'}
              </Button>
            </footer>
          </>
        )}
      </form>
    </Dialog>
  );
}
