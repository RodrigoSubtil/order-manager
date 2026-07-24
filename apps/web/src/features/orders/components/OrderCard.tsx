import { Button, Card } from '../../../shared/components/ui';
import { formatDate } from '../../../shared/lib/dateUtils';
import type { Order } from '../../../shared/lib/domain';
import { SearchHighlight } from './SearchHighlight';
import styles from './OrderCard.module.css';

type OrderCardProps = {
  order: Order;
  search: string;
  responsibleName: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onPrint: () => void;
};

export function OrderCard({
  order,
  search,
  responsibleName,
  onDelete,
  onEdit,
  onPrint,
}: OrderCardProps) {
  return (
    <Card as="article" className={styles.card}>
      <aside className={styles.dateStrip} aria-label="Data de entrega">
        <span>Entrega</span>
        <strong>{formatDate(order.deliveryDate)}</strong>
        <small>{order.deliveryTime || 'Sem hora'}</small>
      </aside>
      <div className={styles.ticket}>
        <header className={styles.head}>
          <div className={styles.client}>
            <div className={styles.meta}>
              <span>
                Responsável: <SearchHighlight query={search} text={responsibleName} />
              </span>
            </div>
            <span>Cliente</span>
            <h2>
              <SearchHighlight query={search} text={order.clientName} />
            </h2>
            <p>
              Telefone: <SearchHighlight query={search} text={order.phone || 'Sem telefone'} />
            </p>
          </div>
          <span className={styles.number}>Pedido #{order.orderNumber ?? '-'}</span>
        </header>

        <div className={styles.products} aria-label="Produtos da encomenda">
          {order.products.map((product) => (
            <div className={styles.product} key={product.id}>
              <span className={styles.category}>{product.category}</span>
              <div className={styles.copy}>
                <strong>
                  <SearchHighlight query={search} text={product.product || 'Produto sem nome'} />
                </strong>
                {product.notes && (
                  <small>
                    <SearchHighlight query={search} text={product.notes} />
                  </small>
                )}
              </div>
              <span className={styles.quantity}>
                <small>Qtd.</small>
                {product.quantity || 'Não indicada'}
              </span>
            </div>
          ))}
        </div>

        <footer className={styles.footer}>
          <div className={styles.actions}>
            <Button variant="ghost" disabled={!onEdit} onClick={onEdit}>
              Editar
            </Button>
            <Button variant="ghost" onClick={onPrint}>
              Imprimir
            </Button>
            {onDelete && (
              <Button variant="ghost" onClick={onDelete}>
                Apagar
              </Button>
            )}
          </div>
        </footer>
      </div>
    </Card>
  );
}
