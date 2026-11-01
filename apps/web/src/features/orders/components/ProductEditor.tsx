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
  FormSectionHeading,
  Icon,
  Input,
} from '../../../shared/components/ui';
import { categories, type CatalogProduct, type Category } from '../../../shared/lib/domain';
import type { ScanReview } from '../hooks/useScanReview';
import { resizeTextArea } from '../lib/orderFormUtils';
import { quantityUnits, type OrderFormValues } from '../schemas/orderSchema';
import type { ScanDraft } from '../schemas/scanDraft';
import { ScanFieldLabel } from './ScanFieldLabel';
import styles from './ProductEditor.module.css';

type ProductEditorProps = {
  catalogProductsByCategory: Map<Category, CatalogProduct[]>;
  itemFields: FieldArrayWithId<OrderFormValues, 'items', 'fieldKey'>[];
  methods: UseFormReturn<OrderFormValues>;
  scanDraft?: ScanDraft | null;
  scanReview?: ScanReview;
  openCategoryPickerId: string | null;
  openProductPickerId: string | null;
  openQuantityPickerId: string | null;
  openUnitPickerId: string | null;
  onAdd: () => void;
  onRemove: (index: number) => void;
  setOpenCategoryPickerId: (itemId: string | null) => void;
  setOpenProductPickerId: (itemId: string | null) => void;
  setOpenQuantityPickerId: (itemId: string | null) => void;
  setOpenUnitPickerId: (itemId: string | null) => void;
};

const quantityOptions = Array.from({ length: 1000 }, (_, index) => String(index + 1));

export function ProductEditor({
  catalogProductsByCategory,
  itemFields,
  methods,
  scanDraft,
  scanReview,
  openCategoryPickerId,
  openProductPickerId,
  openQuantityPickerId,
  openUnitPickerId,
  onAdd,
  onRemove,
  setOpenCategoryPickerId,
  setOpenProductPickerId,
  setOpenQuantityPickerId,
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
    <section
      className={`${styles.editor} ${scanDraft ? styles.compact : ''}`}
      aria-labelledby="product-editor-title"
    >
      <FormSectionHeading id="product-editor-title">Produtos</FormSectionHeading>

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
              <Button
                iconOnly
                variant="danger-subtle"
                aria-label="Remover"
                title={'Remover produto ' + (index + 1)}
                onClick={() => onRemove(index)}
              >
                <Icon name="trash" />
              </Button>
            </div>

            <div className={styles.grid}>
              <div data-form-field>
                <ScanFieldLabel
                  htmlFor={`order-item-${index}-category`}
                  status={scanReview?.itemStatus(itemId, 'category')}
                >
                  Área
                </ScanFieldLabel>
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
                          scanReview?.confirmItemField(itemId, 'category');
                          if (category !== item.category) {
                            setValue(`items.${index}.product`, '', {
                              shouldDirty: true,
                              shouldValidate: isSubmitted,
                            });
                            scanReview?.resetItemField(itemId, 'product');
                          }
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
                <ScanFieldLabel
                  htmlFor={`order-item-${index}-product`}
                  status={scanReview?.itemStatus(itemId, 'product')}
                >
                  Produto
                </ScanFieldLabel>
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
                      scanReview?.confirmItemField(itemId, 'product');
                      setOpenProductPickerId(itemId);
                    }}
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
                          scanReview?.confirmItemField(itemId, 'product');
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

              <div>
                <div className={styles.quantityGrid}>
                  <div data-form-field>
                    <ScanFieldLabel
                      htmlFor={`order-item-${index}-quantity`}
                      status={scanReview?.itemStatus(itemId, 'quantityAmount')}
                    >
                      Quantidade
                    </ScanFieldLabel>
                    <Combobox
                      id={`order-item-${index}-quantity`}
                      isOpen={openQuantityPickerId === itemId}
                      onOpenChange={(open) => setOpenQuantityPickerId(open ? itemId : null)}
                    >
                      <ComboboxInput
                        {...register(`items.${index}.quantityAmount`, {
                          onChange: () => scanReview?.confirmItemField(itemId, 'quantityAmount'),
                        })}
                        required
                        aria-describedby={
                          itemErrors?.quantityAmount
                            ? `order-item-${index}-quantity-error`
                            : undefined
                        }
                        aria-invalid={Boolean(itemErrors?.quantityAmount)}
                        type="number"
                        inputMode="decimal"
                        min="1"
                        max="1000"
                        step="0.01"
                        placeholder="1 a 1000"
                      />
                      <ComboboxTrigger aria-label={`Mostrar quantidades do produto ${index + 1}`} />
                      <ComboboxList className={styles.quantityList}>
                        {quantityOptions.map((quantity) => (
                          <ComboboxOption
                            key={quantity}
                            aria-selected={quantity === item.quantityAmount}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setValue(`items.${index}.quantityAmount`, quantity, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              scanReview?.confirmItemField(itemId, 'quantityAmount');
                              setOpenQuantityPickerId(null);
                            }}
                          >
                            {quantity}
                          </ComboboxOption>
                        ))}
                      </ComboboxList>
                    </Combobox>
                  </div>
                  <div data-form-field>
                    <ScanFieldLabel
                      htmlFor={`order-item-${index}-unit`}
                      status={scanReview?.itemStatus(itemId, 'quantityUnit')}
                    >
                      Unidade
                    </ScanFieldLabel>
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
                              scanReview?.confirmItemField(itemId, 'quantityUnit');
                              setOpenUnitPickerId(null);
                            }}
                          >
                            {unit.toLowerCase()}
                          </ComboboxOption>
                        ))}
                      </ComboboxList>
                    </Combobox>
                  </div>
                </div>
                <FieldError
                  id={`order-item-${index}-quantity-error`}
                  message={itemErrors?.quantityAmount?.message}
                />
              </div>

              <div className={styles.noteField} data-form-field>
                <ScanFieldLabel
                  htmlFor={`order-item-${index}-notes`}
                  status={scanReview?.itemStatus(itemId, 'notes')}
                >
                  Observação deste produto (opcional)
                </ScanFieldLabel>
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
                    scanReview?.confirmItemField(itemId, 'notes');
                    resizeTextArea(event.currentTarget);
                  }}
                  onFocus={(event) => resizeTextArea(event.currentTarget)}
                  placeholder="Ex.: sem açúcar, mensagem no bolo, bem assado..."
                />
                <FieldError
                  id={`order-item-${index}-notes-error`}
                  message={itemErrors?.notes?.message}
                />
              </div>
            </div>
          </article>
        );
      })}

      <Button
        iconOnly
        className={styles.addProduct}
        variant="success-subtle"
        aria-label="Adicionar mais um produto"
        title="Adicionar mais um produto"
        disabled={itemFields.length >= 100}
        onClick={onAdd}
      >
        <Icon name="plus" />
      </Button>
    </section>
  );
}
