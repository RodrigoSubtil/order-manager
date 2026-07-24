import type { Dispatch, SetStateAction } from 'react';
import { type FieldArrayWithId, type UseFormReturn, useWatch } from 'react-hook-form';

import {
  Button,
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxOption,
  ComboboxTrigger,
  FieldError,
  Input,
} from '../../../shared/components/ui';
import { categories, type CatalogProduct, type Category } from '../../../shared/lib/domain';
import { resizeTextArea } from '../lib/orderFormUtils';
import { quantityUnits, type OrderFormValues } from '../schemas/orderSchema';
import styles from './ProductEditor.module.css';

type ProductEditorProps = {
  catalogProductsByCategory: Map<Category, CatalogProduct[]>;
  itemFields: FieldArrayWithId<OrderFormValues, 'items', 'fieldKey'>[];
  methods: UseFormReturn<OrderFormValues>;
  openCategoryPickerId: string | null;
  openProductPickerId: string | null;
  openUnitPickerId: string | null;
  onAdd: () => void;
  onRemove: (index: number) => void;
  setOpenCategoryPickerId: Dispatch<SetStateAction<string | null>>;
  setOpenProductPickerId: Dispatch<SetStateAction<string | null>>;
  setOpenUnitPickerId: Dispatch<SetStateAction<string | null>>;
};

export function ProductEditor({
  catalogProductsByCategory,
  itemFields,
  methods,
  openCategoryPickerId,
  openProductPickerId,
  openUnitPickerId,
  onAdd,
  onRemove,
  setOpenCategoryPickerId,
  setOpenProductPickerId,
  setOpenUnitPickerId,
}: ProductEditorProps) {
  const {
    control,
    formState: { errors, isSubmitted },
    register,
    setValue,
  } = methods;
  const items = useWatch({ control, name: 'items' });

  return (
    <section className={styles.editor} aria-labelledby="product-editor-title">
      <div className={styles.title}>
        <div>
          <span data-eyebrow>Preparação</span>
          <h3 id="product-editor-title">Produtos separados por área</h3>
        </div>
        <Button onClick={onAdd}>Adicionar produto</Button>
      </div>

      <FieldError id="order-items-error" message={errors.items?.root?.message} />

      {itemFields.map((itemField, index) => {
        const item = items[index] ?? itemField;
        const itemId = item.id;
        const itemErrors = errors.items?.[index];
        const matchingCatalogProducts = (catalogProductsByCategory.get(item.category) ?? []).filter(
          (catalogProduct) =>
            catalogProduct.name.toLowerCase().includes(item.product.trim().toLowerCase()),
        );
        const productRegistration = register(`items.${index}.product`);
        const notesRegistration = register(`items.${index}.notes`);

        return (
          <article className={styles.card} key={itemField.fieldKey}>
            <div className={styles.cardTop}>
              <strong>Produto {index + 1}</strong>
              <Button variant="ghost" onClick={() => onRemove(index)}>
                Remover
              </Button>
            </div>

            <div className={styles.grid}>
              <div data-form-field>
                <label htmlFor={`order-item-${index}-category`}>Área</label>
                <Combobox
                  id={`order-item-${index}-category`}
                  isOpen={openCategoryPickerId === itemId}
                  onOpenChange={(open) => setOpenCategoryPickerId(open ? itemId : null)}
                >
                  <ComboboxInput value={item.category} readOnly />
                  <Input type="hidden" {...register(`items.${index}.category`)} />
                  <ComboboxTrigger aria-label={`Mostrar áreas do produto ${index + 1}`} />
                  <ComboboxList>
                    {categories.map((category) => (
                      <ComboboxOption
                        key={category}
                        aria-selected={category === item.category}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setValue(`items.${index}.category`, category, {
                            shouldDirty: true,
                            shouldValidate: isSubmitted,
                          });
                          setValue(`items.${index}.product`, '', {
                            shouldDirty: true,
                            shouldValidate: isSubmitted,
                          });
                          setOpenCategoryPickerId(null);
                          setOpenProductPickerId(null);
                          setOpenUnitPickerId(null);
                        }}
                      >
                        {category}
                      </ComboboxOption>
                    ))}
                  </ComboboxList>
                </Combobox>
              </div>

              <div data-form-field>
                <label htmlFor={`order-item-${index}-product`}>Produto</label>
                <Combobox
                  id={`order-item-${index}-product`}
                  isOpen={openProductPickerId === itemId}
                  onOpenChange={(open) => setOpenProductPickerId(open ? itemId : null)}
                >
                  <ComboboxInput
                    {...productRegistration}
                    required
                    aria-describedby={
                      itemErrors?.product ? `order-item-${index}-product-error` : undefined
                    }
                    aria-invalid={Boolean(itemErrors?.product)}
                    onChange={(event) => {
                      void productRegistration.onChange(event);
                      setOpenProductPickerId(itemId);
                    }}
                    onFocus={() => setOpenProductPickerId(itemId)}
                    placeholder="Digite ou escolha o produto"
                    autoComplete="off"
                  />
                  <ComboboxTrigger aria-label={`Mostrar produtos do item ${index + 1}`} />
                  <ComboboxList>
                    {matchingCatalogProducts.map((catalogProduct) => (
                      <ComboboxOption
                        key={catalogProduct.id}
                        aria-selected={catalogProduct.name === item.product}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setValue(`items.${index}.product`, catalogProduct.name, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          setOpenProductPickerId(null);
                        }}
                      >
                        {catalogProduct.name}
                      </ComboboxOption>
                    ))}
                    {matchingCatalogProducts.length === 0 && (
                      <ComboboxEmpty>
                        Nenhum produto encontrado. Pode escrever um novo.
                      </ComboboxEmpty>
                    )}
                  </ComboboxList>
                </Combobox>
                <FieldError
                  id={`order-item-${index}-product-error`}
                  message={itemErrors?.product?.message}
                />
              </div>

              <div data-form-field>
                <label htmlFor={`order-item-${index}-quantity`}>Quantidade</label>
                <div className={styles.quantityGrid}>
                  <Input
                    id={`order-item-${index}-quantity`}
                    {...register(`items.${index}.quantityAmount`)}
                    required
                    aria-describedby={
                      itemErrors?.quantityAmount ? `order-item-${index}-quantity-error` : undefined
                    }
                    aria-invalid={Boolean(itemErrors?.quantityAmount)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qtd."
                  />
                  <Combobox
                    id={`order-item-${index}-unit`}
                    isOpen={openUnitPickerId === itemId}
                    onOpenChange={(open) => setOpenUnitPickerId(open ? itemId : null)}
                  >
                    <ComboboxInput
                      className={styles.unitInput}
                      aria-label={`Unidade do produto ${index + 1}`}
                      value={item.quantityUnit.toLowerCase()}
                      readOnly
                    />
                    <Input type="hidden" {...register(`items.${index}.quantityUnit`)} />
                    <ComboboxTrigger aria-label={`Mostrar unidades do produto ${index + 1}`} />
                    <ComboboxList>
                      {quantityUnits.map((unit) => (
                        <ComboboxOption
                          key={unit}
                          aria-selected={unit === item.quantityUnit}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setValue(`items.${index}.quantityUnit`, unit, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            setOpenUnitPickerId(null);
                          }}
                        >
                          {unit.toLowerCase()}
                        </ComboboxOption>
                      ))}
                    </ComboboxList>
                  </Combobox>
                </div>
                <FieldError
                  id={`order-item-${index}-quantity-error`}
                  message={itemErrors?.quantityAmount?.message}
                />
              </div>

              <div className={styles.noteField} data-form-field>
                <label htmlFor={`order-item-${index}-notes`}>
                  Observação deste produto (opcional)
                  <textarea
                    {...notesRegistration}
                    id={`order-item-${index}-notes`}
                    className={styles.note}
                    aria-describedby={
                      itemErrors?.notes ? `order-item-${index}-notes-error` : undefined
                    }
                    aria-invalid={Boolean(itemErrors?.notes)}
                    rows={3}
                    onChange={(event) => {
                      void notesRegistration.onChange(event);
                      resizeTextArea(event.currentTarget);
                    }}
                    onFocus={(event) => resizeTextArea(event.currentTarget)}
                    placeholder="Ex.: sem açúcar, mensagem no bolo, bem assado..."
                  />
                </label>
                <FieldError
                  id={`order-item-${index}-notes-error`}
                  message={itemErrors?.notes?.message}
                />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
