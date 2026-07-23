import { EmptyState, Spinner } from '../../../shared/components/ui';
import type { Order } from '../../../shared/lib/domain';
import { OrderCard } from './OrderCard';
import styles from './OrderList.module.css';

type OrderListProps = {
  isLoading: boolean;
  orders: Order[];
  getResponsibleName: (order: Order) => string;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onEdit: (order: Order) => void;
  onPrint: (id: string) => void;
};

export function OrderList({
  isLoading,
  orders,
  getResponsibleName,
  canDelete,
  onDelete,
  onEdit,
  onPrint,
}: OrderListProps) {
  return (
    <div className={styles.list} aria-busy={isLoading} aria-live="polite">
      {isLoading ? (
        <EmptyState
          className={styles.loading}
          title="A carregar encomendas..."
          description={
            <span className={styles.loadingCopy}>
              <Spinner label="A carregar encomendas" />
              <span>A ligar à API segura.</span>
            </span>
          }
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Nenhuma encomenda encontrada."
          description="Clique em Nova encomenda para registar o próximo pedido."
        />
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            responsibleName={getResponsibleName(order)}
            onDelete={canDelete ? () => onDelete(order.id) : undefined}
            onEdit={() => onEdit(order)}
            onPrint={() => onPrint(order.id)}
          />
        ))
      )}
    </div>
  );
}
