import { Button, Card } from '../../../shared/components/ui';
import { formatDate } from '../../../shared/lib/dateUtils';
import type { Order } from '../../../shared/lib/domain';
import styles from './OrderCard.module.css';

type OrderCardProps = {
  order: Order;
  responsibleName: string;
  onDelete?: () => void;
  onEdit: () => void;
  onPrint: () => void;
};

export function OrderCard({ order, responsibleName, onDelete, onEdit, onPrint }: OrderCardProps) {
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
              <span>Responsável: {responsibleName}</span>
            </div>
            <span>Cliente</span>
            <h2>{order.clientName}</h2>
            <p>Telefone: {order.phone || 'Sem telefone'}</p>
          </div>
          <span className={styles.number}>Pedido #{order.orderNumber ?? '-'}</span>
        </header>

        <div className={styles.products} aria-label="Produtos da encomenda">
          {order.products.map((product) => (
            <div className={styles.product} key={product.id}>
              <span className={styles.category}>{product.category}</span>
              <div className={styles.copy}>
                <strong>{product.product || 'Produto sem nome'}</strong>
                {product.notes && <small>{product.notes}</small>}
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
            <Button variant="ghost" onClick={onEdit}>
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
