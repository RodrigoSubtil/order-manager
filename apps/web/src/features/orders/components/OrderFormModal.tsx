import { useEffect, useState } from 'react';
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
  DialogActions,
  DialogHeader,
  FieldError,
  FormSectionHeading,
  Icon,
  Input,
  SuccessMessage,
  TimePicker,
} from '../../../shared/components/ui';
import type { CatalogProduct, Category, OrderResponsible } from '../../../shared/lib/domain';
import { useScanReview } from '../hooks/useScanReview';
import { currentTimeKey, todayKey } from '../../../shared/lib/dateUtils';
import { phoneCountries } from '../lib/phoneNumber';
import { PhoneInput } from './PhoneInput';
import { normalizeResponsibleName } from '../lib/responsibleName';
import type { OrderFormValues } from '../schemas/orderSchema';
import type { ScanDraft } from '../schemas/scanDraft';
import { CustomerPicker } from './CustomerPicker';
import { ProductEditor } from './ProductEditor';
import { ScanFieldLabel } from './ScanFieldLabel';
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
  onCustomerPickerOpen: () => void;
  onClose: () => void;
  onRemoveProduct: (index: number) => void;
  onReturnToOrders: () => Promise<void>;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  savedOrderMessage: string;
  scanDraft?: ScanDraft | null;
  setIsResponsiblePickerOpen: (open: boolean) => void;
  setOpenCategoryPickerId: (itemId: string | null) => void;
  setOpenProductPickerId: (itemId: string | null) => void;
  setOpenQuantityPickerId: (itemId: string | null) => void;
  setOpenUnitPickerId: (itemId: string | null) => void;
};

export function OrderFormModal(props: OrderFormModalProps) {
  const [businessNow, setBusinessNow] = useState(() => new Date());
  const [isPhoneCountryOpen, setIsPhoneCountryOpen] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setBusinessNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
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
    onCustomerPickerOpen,
    onClose,
    onRemoveProduct,
    onReturnToOrders,
    onSubmit,
    savedOrderMessage,
    scanDraft,
    setIsResponsiblePickerOpen,
    setOpenCategoryPickerId,
    setOpenProductPickerId,
    setOpenQuantityPickerId,
    setOpenUnitPickerId,
  } = props;
  const scanReview = useScanReview(scanDraft);
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setValue,
    watch,
  } = methods;
  const deliveryDate = watch('deliveryDate');
  const responsibleName = watch('responsibleName');
  const responsibleQuery = responsibleName.trim().toLocaleLowerCase('pt-PT');
  const visibleResponsibles = responsibles.filter((responsible) =>
    responsible.name.toLocaleLowerCase('pt-PT').includes(responsibleQuery),
  );
  const phoneCountryCode = watch('phoneCountryCode');
  const phoneCountry = phoneCountries.find((country) => country.code === phoneCountryCode);
  const responsibleError = errors.responsibleId?.message || errors.responsibleName?.message;
  const submissionError =
    errors.root?.validation?.message || errors.root?.conflict?.message || errors.root?.api?.message;
  const closeDialog = () => {
    if (savedOrderMessage) void onReturnToOrders();
    else onClose();
  };

  return (
    <Dialog
      className={`${styles.dialog} ${scanDraft ? styles.scanDialog : ''}`}
      size={savedOrderMessage ? 'small' : 'large'}
      titleId="modal-title"
      onClose={closeDialog}
    >
      <form noValidate onSubmit={onSubmit}>
        {!savedOrderMessage && (
          <DialogHeader
            title={editingId ? 'Editar pedido' : scanDraft ? 'Revisar encomenda' : 'Novo pedido'}
            titleId="modal-title"
            onClose={closeDialog}
          />
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
                <FormSectionHeading id="order-details-title">Dados da encomenda</FormSectionHeading>
                <div className={styles.fieldGrid}>
                  <div data-form-field>
                    <ScanFieldLabel
                      htmlFor="order-responsible"
                      status={scanReview.fieldStatus('responsibleName')}
                    >
                      Responsável pela encomenda
                    </ScanFieldLabel>
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
                            data-autofocus
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            required
                            aria-describedby={
                              responsibleError ? 'order-responsible-error' : undefined
                            }
                            aria-invalid={Boolean(responsibleError)}
                            onChange={(event) => {
                              field.onChange(event.target.value);
                              scanReview.confirmField('responsibleName');
                              setValue('responsibleId', '', { shouldDirty: true });
                              setIsResponsiblePickerOpen(true);
                            }}
                            onBlur={(event) => {
                              field.onBlur();
                              if (methods.getValues('responsibleId')) return;
                              const normalized = normalizeResponsibleName(event.target.value);
                              if (normalized !== event.target.value) {
                                setValue('responsibleName', normalized, { shouldDirty: true });
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && isResponsiblePickerOpen) {
                                event.preventDefault();
                                setIsResponsiblePickerOpen(false);
                              }
                            }}
                            placeholder="Digite ou escolha o responsável"
                            autoComplete="off"
                          />
                        )}
                      />
                      <Input type="hidden" {...register('responsibleId')} />
                      <ComboboxTrigger aria-label="Mostrar responsáveis" />
                      <ComboboxList>
                        {visibleResponsibles.map((responsible) => (
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
                              scanReview.confirmField('responsibleName');
                              setIsResponsiblePickerOpen(false);
                            }}
                          >
                            {responsible.name}
                          </ComboboxOption>
                        ))}
                        {visibleResponsibles.length === 0 && (
                          <ComboboxEmpty>
                            {responsibleQuery
                              ? 'Novo responsável será criado ao guardar.'
                              : 'Nenhum responsável cadastrado.'}
                          </ComboboxEmpty>
                        )}
                      </ComboboxList>
                    </Combobox>
                    <FieldError id="order-responsible-error" message={responsibleError} />
                  </div>
                  <CustomerPicker
                    methods={methods}
                    onOpen={onCustomerPickerOpen}
                    scanStatus={scanReview.fieldStatus('clientName')}
                    onReview={() => scanReview.confirmField('clientName')}
                    onPhoneReview={() => scanReview.confirmField('phone')}
                  />
                  <div data-form-field>
                    <ScanFieldLabel htmlFor="order-phone" status={scanReview.fieldStatus('phone')}>
                      Telefone
                    </ScanFieldLabel>
                    <div className={styles.phoneGrid}>
                      <Combobox
                        id="order-phone-country"
                        isOpen={isPhoneCountryOpen}
                        onOpenChange={setIsPhoneCountryOpen}
                      >
                        <ComboboxInput
                          aria-label="País e prefixo do telefone"
                          aria-describedby={
                            errors.phoneCountryCode ? 'order-phone-country-error' : undefined
                          }
                          aria-invalid={Boolean(errors.phoneCountryCode)}
                          value={
                            phoneCountry
                              ? `${phoneCountry.country} +${phoneCountry.code}`
                              : phoneCountryCode
                                ? `Outro +${phoneCountryCode}`
                                : 'Outro prefixo'
                          }
                          readOnly
                        />
                        <ComboboxTrigger aria-label="Escolher país do telefone" />
                        <ComboboxList>
                          {phoneCountries.map((country) => (
                            <ComboboxOption
                              key={country.country}
                              aria-selected={country.code === phoneCountryCode}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setValue('phoneCountryCode', country.code, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                scanReview.confirmField('phone');
                                setIsPhoneCountryOpen(false);
                              }}
                            >
                              {country.name} (+{country.code})
                            </ComboboxOption>
                          ))}
                          <ComboboxOption
                            aria-selected={!phoneCountry}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setValue('phoneCountryCode', '', {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              scanReview.confirmField('phone');
                              setIsPhoneCountryOpen(false);
                            }}
                          >
                            Outro prefixo
                          </ComboboxOption>
                        </ComboboxList>
                      </Combobox>
                      <Controller
                        control={control}
                        name="phone"
                        render={({ field }) => (
                          <span className={styles.iconInput}>
                            <PhoneInput
                              id="order-phone"
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              countryCode={phoneCountryCode}
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                scanReview.confirmField('phone');
                              }}
                              className={styles.inputWithIcon}
                              required
                              aria-describedby={errors.phone ? 'order-phone-error' : undefined}
                              aria-invalid={Boolean(errors.phone)}
                              placeholder={
                                phoneCountryCode === '351'
                                  ? 'Ex.: 912 000 000'
                                  : 'Número de telefone'
                              }
                            />
                            <Icon name="phone" placement="field" />
                          </span>
                        )}
                      />
                    </div>
                    {!phoneCountry && (
                      <Input
                        aria-label="Prefixo internacional"
                        inputMode="numeric"
                        maxLength={3}
                        placeholder="Prefixo: ex. 972"
                        value={phoneCountryCode}
                        onChange={(event) => {
                          setValue('phoneCountryCode', event.target.value.replace(/\D/g, ''), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          scanReview.confirmField('phone');
                        }}
                      />
                    )}
                    <FieldError
                      id="order-phone-country-error"
                      message={errors.phoneCountryCode?.message}
                    />
                    <FieldError id="order-phone-error" message={errors.phone?.message} />
                  </div>
                  <div data-form-field>
                    <ScanFieldLabel
                      htmlFor="order-delivery-date"
                      status={scanReview.fieldStatus('deliveryDate')}
                    >
                      Data de entrega
                    </ScanFieldLabel>
                    <Controller
                      control={control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <DatePicker
                          id="order-delivery-date"
                          className={styles.dateInput}
                          minDate={todayKey(businessNow)}
                          required
                          aria-describedby={
                            errors.deliveryDate ? 'order-delivery-date-error' : undefined
                          }
                          aria-invalid={Boolean(errors.deliveryDate)}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            scanReview.confirmField('deliveryDate');
                          }}
                        />
                      )}
                    />
                    <FieldError
                      id="order-delivery-date-error"
                      message={errors.deliveryDate?.message}
                    />
                  </div>
                  <div data-form-field>
                    <ScanFieldLabel
                      htmlFor="order-delivery-time"
                      status={scanReview.fieldStatus('deliveryTime')}
                    >
                      Hora
                    </ScanFieldLabel>
                    <Controller
                      control={control}
                      name="deliveryTime"
                      render={({ field }) => (
                        <TimePicker
                          id="order-delivery-time"
                          className={styles.dateInput}
                          minTime={
                            deliveryDate === todayKey(businessNow)
                              ? currentTimeKey(businessNow) > '08:00'
                                ? currentTimeKey(businessNow)
                                : '08:00'
                              : '08:00'
                          }
                          maxTime="21:00"
                          required
                          aria-describedby={
                            errors.deliveryTime ? 'order-delivery-time-error' : undefined
                          }
                          aria-invalid={Boolean(errors.deliveryTime)}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            scanReview.confirmField('deliveryTime');
                          }}
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
                scanDraft={scanDraft}
                scanReview={scanReview}
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

            <DialogActions>
              <Button
                iconOnly
                variant="danger-subtle"
                aria-label="Cancelar"
                title="Cancelar"
                disabled={isSubmitting}
                onClick={onClose}
              >
                <Icon name="trash" />
              </Button>
              <Button
                iconOnly
                variant="success"
                type="submit"
                aria-label={isSubmitting ? 'A salvar...' : 'Salvar'}
                title={isSubmitting ? 'A salvar...' : 'Salvar'}
                aria-busy={isSubmitting}
                disabled={isSubmitting}
              >
                <Icon name="check" />
              </Button>
            </DialogActions>
          </>
        )}
      </form>
    </Dialog>
  );
}
