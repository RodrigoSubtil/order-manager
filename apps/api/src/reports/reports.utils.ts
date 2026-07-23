import { ProductCategory, QuantityUnit } from '../generated/prisma/client';

export type ReportItem = {
  category: ProductCategory;
  productName: string;
  quantityValue: string;
  quantityUnit: QuantityUnit;
};
export type ProductionSummary = Array<{
  category: ProductCategory;
  items: Array<{
    category: ProductCategory;
    productName: string;
    quantityValue: string;
    quantityUnit: QuantityUnit;
    orderCount: number;
  }>;
}>;

export function buildProductionSummary(items: ReportItem[]): ProductionSummary {
  const grouped = new Map<
    string,
    {
      category: ProductCategory;
      productName: string;
      quantityValue: bigint;
      quantityUnit: QuantityUnit;
      orderCount: number;
    }
  >();
  for (const item of items) {
    const value = decimalToThousandths(item.quantityValue);
    const key = `${item.category}|${item.productName.trim().toLocaleLowerCase('pt-PT')}|${item.quantityUnit}`;
    const current = grouped.get(key);
    if (current) {
      current.quantityValue += value;
      current.orderCount += 1;
    } else {
      grouped.set(key, {
        category: item.category,
        productName: item.productName.trim(),
        quantityValue: value,
        quantityUnit: item.quantityUnit,
        orderCount: 1,
      });
    }
  }

  return [ProductCategory.PASTELARIA, ProductCategory.PADARIA, ProductCategory.SALGADOS]
    .map((category) => ({
      category,
      items: [...grouped.values()]
        .filter((item) => item.category === category)
        .sort(
          (first, second) =>
            first.productName.localeCompare(second.productName, 'pt-PT') ||
            first.quantityUnit.localeCompare(second.quantityUnit),
        )
        .map((item) => ({ ...item, quantityValue: thousandthsToDecimal(item.quantityValue) })),
    }))
    .filter((group) => group.items.length > 0);
}

function decimalToThousandths(value: string): bigint {
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  const normalizedWhole = whole || '0';
  const normalizedFraction = `${fraction}000`.slice(0, 3);
  return BigInt(normalizedWhole) * BigInt(1000) + BigInt(normalizedFraction);
}

function thousandthsToDecimal(value: bigint): string {
  const sign = value < 0 ? '-' : '';
  const absolute = value < 0 ? -value : value;
  const whole = absolute / BigInt(1000);
  const fraction = (absolute % BigInt(1000)).toString().padStart(3, '0').replace(/0+$/, '');
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`;
}
