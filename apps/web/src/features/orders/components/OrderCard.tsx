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
  onComplete?: () => void;
  onEdit?: () => void;
  onPrint: () => void;
};

export function OrderCard({
  order,
  search,
  responsibleName,
  onDelete,
  onComplete,
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
          <div className={styles.actions} aria-label="Ações da encomenda">
            <Button
              iconOnly
              className={styles.actionButton}
              variant="primary"
              aria-label="Concluir"
              title="Concluir"
              disabled={!onComplete}
              onClick={onComplete}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </Button>
            <Button
              iconOnly
              className={styles.actionButton}
              variant="ghost"
              aria-label="Editar"
              title="Editar"
              disabled={!onEdit}
              onClick={onEdit}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m14.5 5.5 4 4M4 20l4.4-1 10.1-10.1a1.4 1.4 0 0 0 0-2l-1.4-1.4a1.4 1.4 0 0 0-2 0L5 15.6 4 20Z" />
              </svg>
            </Button>
            <Button
              iconOnly
              className={styles.actionButton}
              variant="ghost"
              aria-label="Imprimir"
              title="Imprimir"
              onClick={onPrint}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
              </svg>
            </Button>
            {onDelete && (
              <Button
                iconOnly
                className={`${styles.actionButton} ${styles.deleteAction}`}
                variant="ghost"
                aria-label="Apagar"
                title="Apagar"
                onClick={onDelete}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" />
                </svg>
              </Button>
            )}
          </div>
        </footer>
      </div>
    </Card>
  );
}
