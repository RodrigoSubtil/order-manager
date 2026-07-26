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
  Icon,
  Input,
  SuccessMessage,
  TimePicker,
} from '../../../shared/components/ui';
import type { CatalogProduct, Category, OrderResponsible } from '../../../shared/lib/domain';
import { currentTimeKey, todayKey } from '../../../shared/lib/dateUtils';
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
  openQuantityPickerId: string | null;
  openUnitPickerId: string | null;
  responsibles: OrderResponsible[];
  onAddProduct: () => void;
  onClose: () => void;
  onRemoveProduct: (index: number) => void;
  onReturnToOrders: () => Promise<void>;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  savedOrderMessage: string;
  setIsResponsiblePickerOpen: (open: boolean) => void;
  setOpenCategoryPickerId: (itemId: string | null) => void;
  setOpenProductPickerId: (itemId: string | null) => void;
  setOpenQuantityPickerId: (itemId: string | null) => void;
  setOpenUnitPickerId: (itemId: string | null) => void;
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
    openQuantityPickerId,
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
    setOpenQuantityPickerId,
    setOpenUnitPickerId,
  } = props;
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setValue,
    watch,
  } = methods;
  const deliveryDate = watch('deliveryDate');
  const responsibleError = errors.responsibleId?.message || errors.responsibleName?.message;
  const submissionError =
    errors.root?.validation?.message || errors.root?.conflict?.message || errors.root?.api?.message;
  const closeDialog = () => {
    if (savedOrderMessage) void onReturnToOrders();
    else onClose();
  };

  return (
    <Dialog
      className={savedOrderMessage ? undefined : styles.dialog}
      size={savedOrderMessage ? 'small' : 'large'}
      titleId="modal-title"
      onClose={closeDialog}
    >
      <form noValidate onSubmit={onSubmit}>
        {!savedOrderMessage && (
          <header className={styles.header}>
            <div>
              <span data-eyebrow>{editingId ? 'Editar pedido' : 'Novo pedido'}</span>
              <h2 id="modal-title">{editingId ? 'Editar encomenda' : 'Adicionar encomenda'}</h2>
            </div>
            <Button iconOnly variant="ghost" aria-label="Fechar" onClick={closeDialog}>
              ×
            </Button>
          </header>
        )}

        {savedOrderMessage ? (
          <SuccessMessage
            actionLabel="Voltar para as encomendas"
            onAction={() => void onReturnToOrders()}
            title={savedOrderMessage}
            titleId="modal-title"
          />
        ) : (
          <>
            <div className={styles.body}>
              {submissionError && <Alert tone="error">{submissionError}</Alert>}

              <section className={styles.detailsSection} aria-labelledby="order-details-title">
                <div className={styles.sectionTitle}>
                  <span data-eyebrow>Encomenda</span>
                  <h3 id="order-details-title">Dados da encomenda</h3>
                </div>
                <div className={styles.fieldGrid}>
                  <div data-form-field>
                    <label htmlFor="order-client-name">
                      Nome do cliente
                      <span className={styles.iconInput}>
                        <Input
                          id="order-client-name"
                          className={styles.inputWithIcon}
                          data-autofocus
                          required
                          {...register('clientName')}
                          aria-describedby={
                            errors.clientName ? 'order-client-name-error' : undefined
                          }
                          aria-invalid={Boolean(errors.clientName)}
                          placeholder="Ex.: Ana Silva"
                        />
                        <Icon name="user" placement="field" />
                      </span>
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
                          <span className={styles.iconInput}>
                            <Input
                              {...field}
                              id="order-phone"
                              className={styles.inputWithIcon}
                              required
                              aria-describedby={errors.phone ? 'order-phone-error' : undefined}
                              aria-invalid={Boolean(errors.phone)}
                              inputMode="numeric"
                              onChange={(event) =>
                                field.onChange(event.target.value.replace(/\D/g, ''))
                              }
                              placeholder="Ex.: 912000000"
                            />
                            <Icon name="phone" placement="field" />
                          </span>
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
                    <label htmlFor="order-delivery-time">Hora</label>
                    <Controller
                      control={control}
                      name="deliveryTime"
                      render={({ field }) => (
                        <TimePicker
                          id="order-delivery-time"
                          className={styles.dateInput}
                          minTime={deliveryDate === todayKey() ? currentTimeKey() : undefined}
                          required
                          aria-describedby={
                            errors.deliveryTime ? 'order-delivery-time-error' : undefined
                          }
                          aria-invalid={Boolean(errors.deliveryTime)}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <FieldError
                      id="order-delivery-time-error"
                      message={errors.deliveryTime?.message}
                    />
                  </div>
                </div>
              </section>

              <ProductEditor
                catalogProductsByCategory={catalogProductsByCategory}
                itemFields={itemFields}
                methods={methods}
                openCategoryPickerId={openCategoryPickerId}
                openProductPickerId={openProductPickerId}
                openQuantityPickerId={openQuantityPickerId}
                openUnitPickerId={openUnitPickerId}
                onAdd={onAddProduct}
                onRemove={onRemoveProduct}
                setOpenCategoryPickerId={setOpenCategoryPickerId}
                setOpenProductPickerId={setOpenProductPickerId}
                setOpenQuantityPickerId={setOpenQuantityPickerId}
                setOpenUnitPickerId={setOpenUnitPickerId}
              />
            </div>

            <footer className={styles.actions}>
              <Button disabled={isSubmitting} onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'A salvar...' : 'Salvar'}
              </Button>
            </footer>
          </>
        )}
      </form>
    </Dialog>
  );
}
