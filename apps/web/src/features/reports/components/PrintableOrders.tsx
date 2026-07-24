import { formatDate } from '../../../shared/lib/dateUtils';
import type { Order } from '../../../shared/lib/domain';
import { groupProducts, type PrintProductSummary } from '../../../shared/lib/productGrouping';
import type { PrintMode, PrintRangeMode } from '../hooks/usePrintOrders';
import styles from './PrintableOrders.module.css';

type PrintableOrdersProps = {
  getResponsibleName: (order: Order) => string;
  printAll: boolean;
  printDescription: string;
  printFrom: string;
  printFromTime: string;
  printMode: PrintMode;
  printOrderCount: number;
  printOrders: Order[];
  printProductSummary: PrintProductSummary;
  printRangeMode: PrintRangeMode;
  printUntil: string;
  printUntilTime: string;
};

export function PrintableOrders({
  getResponsibleName,
  printAll,
  printDescription,
  printFrom,
  printFromTime,
  printMode,
  printOrderCount,
  printOrders,
  printProductSummary,
  printRangeMode,
  printUntil,
  printUntilTime,
}: PrintableOrdersProps) {
  return (
    <section className={styles.area} data-print-root aria-hidden="true">
      <div className={styles.title}>
        <div>
          <strong>Order Manager</strong>
          <span>Ordem de producao</span>
        </div>
        <small>{printDescription}</small>
      </div>

      {printMode === 'summary' && printAll ? (
        <article className={styles.card}>
          <header className={styles.header}>
            <div className={styles.client}>
              <span>Resumo</span>
              <h2>Quantidade total por produto</h2>
              <p>
                {printOrderCount}{' '}
                {printOrderCount === 1 ? 'encomenda considerada' : 'encomendas consideradas'}
              </p>
            </div>
            <div className={styles.delivery}>
              <span>Periodo</span>
              <strong>
                {printRangeMode === 'day'
                  ? formatDate(printFrom)
                  : `${formatDate(printFrom)} ate ${formatDate(printUntil)}`}
              </strong>
              <small>
                {printFromTime}–{printUntilTime} · Produtos agrupados
              </small>
            </div>
          </header>
          <div className={styles.products}>
            {printProductSummary.map((group) => (
              <section className={styles.group} key={group.category}>
                <h3>{group.category}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Quantidade total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.products.map((product) => (
                      <tr key={`${product.category}-${product.product}-${product.unit}`}>
                        <td>{product.product}</td>
                        <td>{product.displayQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        </article>
      ) : (
        printOrders.map((order) => (
          <article className={styles.card} key={order.id}>
            <header className={styles.header}>
              <div className={styles.client}>
                <span>Cliente</span>
                <p>Pedido #{order.orderNumber ?? '-'}</p>
                <h2>{order.clientName}</h2>
                <p>Telefone: {order.phone || 'Sem telefone'}</p>
                <p>Responsavel: {getResponsibleName(order)}</p>
              </div>
              <div className={styles.delivery}>
                <span>Entrega</span>
                <strong>{formatDate(order.deliveryDate)}</strong>
                <small>{order.deliveryTime || 'Sem hora marcada'}</small>
              </div>
            </header>
            <div className={styles.products}>
              {groupProducts(order.products).map((group) => (
                <section className={styles.group} key={group.category}>
                  <h3>{group.category}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.products.map((product) => (
                        <tr key={product.id}>
                          <td>{product.product}</td>
                          <td>{product.quantity}</td>
                          <td>{product.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
