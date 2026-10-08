import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';

import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxOption,
  ComboboxTrigger,
  FieldError,
  FormMessage,
} from '../../../shared/components/ui';
import { searchCustomers } from '../../../shared/lib/supabaseData';
import { formatInternationalPhone, splitInternationalPhone } from '../lib/phoneNumber';
import type { OrderFormValues } from '../schemas/orderSchema';
import type { ScanStatus } from '../schemas/scanDraft';
import { ScanFieldLabel } from './ScanFieldLabel';
import styles from './CustomerPicker.module.css';

type Props = {
  methods: UseFormReturn<OrderFormValues>;
  onOpen?: () => void;
  scanStatus?: ScanStatus;
};

export function CustomerPicker({ methods, onOpen, scanStatus }: Props) {
  const {
    control,
    formState: { errors },
    setValue,
  } = methods;
  const customerId = useWatch({ control, name: 'customerId' });
  const name = useWatch({ control, name: 'clientName' });
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedName, setDebouncedName] = useState('');
  const changeOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) onOpen?.();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(name.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [name]);
  const customers = useQuery({
    queryKey: ['supabase', 'customers', debouncedName.toLocaleLowerCase('pt-PT')],
    queryFn: () => searchCustomers(debouncedName),
    enabled: isOpen && debouncedName.length >= 1,
    retry: false,
    staleTime: 30_000,
  });

  return (
    <div data-form-field>
      <ScanFieldLabel htmlFor="order-client-name" status={scanStatus}>
        Nome do cliente
      </ScanFieldLabel>
      <Combobox
        id="order-client-name"
        isOpen={isOpen}
        onOpenChange={changeOpen}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
        }}
      >
        <Controller
          control={control}
          name="clientName"
          render={({ field }) => (
            <ComboboxInput
              {...field}
              required
              aria-describedby={errors.clientName ? 'order-client-name-error' : undefined}
              aria-invalid={Boolean(errors.clientName)}
              onChange={(event) => {
                field.onChange(event);
                setIsOpen(true);
                onOpen?.();
              }}
              placeholder="Ex.: Ana Silva"
              autoComplete="off"
            />
          )}
        />
        <ComboboxTrigger aria-label="Mostrar clientes" />
        <ComboboxList>
          {!name.trim() ? (
            <ComboboxEmpty>Escreva o nome para procurar clientes.</ComboboxEmpty>
          ) : customers.isPending || debouncedName !== name.trim() ? (
            <ComboboxEmpty>A procurar clientes...</ComboboxEmpty>
          ) : customers.isError ? (
            <ComboboxEmpty>Não foi possível procurar clientes.</ComboboxEmpty>
          ) : customers.data?.length ? (
            customers.data.map((customer) => (
              <ComboboxOption
                key={customer.id}
                aria-label={`${customer.name}, telefone ${formatInternationalPhone(customer.phone)}`}
                aria-selected={customerId === customer.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const phone = splitInternationalPhone(customer.phone);
                  setValue('customerId', customer.id, { shouldDirty: true });
                  setValue('customerVersion', customer.version);
                  setValue('originalCustomerName', customer.name);
                  setValue('originalCustomerPhone', customer.phone);
                  setValue('clientName', customer.name, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue('phoneCountryCode', phone.countryCode, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue('phone', phone.nationalNumber, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setIsOpen(false);
                }}
              >
                <span className={styles.suggestionName}>{customer.name}</span>
                <span className={styles.suggestionPhone}>
                  {formatInternationalPhone(customer.phone)}
                </span>
              </ComboboxOption>
            ))
          ) : (
            <ComboboxEmpty>
              Nenhum cliente encontrado. O cadastro será criado ao guardar.
            </ComboboxEmpty>
          )}
        </ComboboxList>
      </Combobox>
      {customerId && (
        <FormMessage>
          Cliente selecionado. Alterar nome ou telefone atualiza este cadastro.
        </FormMessage>
      )}
      <FieldError id="order-client-name-error" message={errors.clientName?.message} />
    </div>
  );
}
