import { categories, type Category, type Order, type ProductLine } from './domain';
import { formatQuantityTotal, isSummableQuantityUnit, parseQuantity } from './quantityUtils';

export type PrintProductSummary = Array<{
  category: Category;
  products: Array<{
    category: Category;
    product: string;
    amount: number;
    unit: string;
    count: number;
    displayQuantity: string;
  }>;
}>;

export function groupProducts(products: ProductLine[]) {
  return categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.category === category),
    }))
    .filter((group) => group.products.length > 0);
}

export function buildPrintProductSummary(orders: Order[]): PrintProductSummary {
  const summary = new Map<
    string,
    {
      category: Category;
      product: string;
      amount: number;
      unit: string;
      count: number;
      displayQuantity: string;
    }
  >();

  orders.forEach((order) => {
    order.products.forEach((product) => {
      const { amount, unit, raw } = parseQuantity(product.quantity);
      const canSum = isSummableQuantityUnit(unit);
      const key = canSum
        ? `${product.category}|${product.product}|${unit}`
        : `${product.category}|${product.product}|${raw || product.quantity}`;
      const current = summary.get(key);

      if (current) {
        current.count += 1;
        if (canSum) {
          current.amount += amount;
          current.displayQuantity = formatQuantityTotal(current.amount, current.unit);
        } else {
          current.displayQuantity = `${current.count} pedidos x ${raw || product.quantity}`;
        }
        return;
      }

      summary.set(key, {
        category: product.category,
        product: product.product || 'Produto sem nome',
        amount,
        unit,
        count: 1,
        displayQuantity: canSum ? formatQuantityTotal(amount, unit) : raw || product.quantity,
      });
    });
  });

  return categories
    .map((category) => ({
      category,
      products: [...summary.values()]
        .filter((product) => product.category === category)
        .sort((first, second) => first.product.localeCompare(second.product)),
    }))
    .filter((group) => group.products.length > 0);
}
