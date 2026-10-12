import { useMemo } from 'react';

import { Button, Card, Icon } from '../../../shared/components/ui';
import { formatDate } from '../../../shared/lib/dateUtils';
import type { Order } from '../../../shared/lib/domain';
import { groupProducts } from '../../../shared/lib/productGrouping';
import { formatInternationalPhone } from '../lib/phoneNumber';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { pickupDeadline, pickupDelayMinutes } from '../lib/overduePickups';
import { OverduePickupBadge } from './OverduePickupNotice';
import { SearchHighlight } from './SearchHighlight';
import styles from './OrderCard.module.css';

type OrderCardProps = {
  order: Order;
  now?: number;
  search: string;
  responsibleName: string;
  onDelete?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onPrint: () => void;
};

export function OrderCard({
  order,
  now,
  search,
  responsibleName,
  onDelete,
  onComplete,
  onEdit,
  onPrint,
}: OrderCardProps) {
  const whatsAppUrl = getWhatsAppUrl(order.phone);
  const deadline = useMemo(
    () => pickupDeadline(order.deliveryDate, order.deliveryTime),
    [order.deliveryDate, order.deliveryTime],
  );
  const delayMinutes = now === undefined ? null : pickupDelayMinutes(deadline, now);

  const openWhatsApp = () => {
    if (!whatsAppUrl) return;

    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card as="article" className={styles.card}>
      <aside className={styles.dateStrip} aria-label="Data de entrega">
        <strong>
          <Icon name="calendar" />
          {formatDate(order.deliveryDate)}
        </strong>
        <small>
          <Icon name="clock" />
          {order.deliveryTime || 'Sem hora'}
        </small>
      </aside>
      <div className={styles.ticket}>
        <header className={styles.head}>
          <div className={styles.overview}>
            {delayMinutes !== null && <OverduePickupBadge minutes={delayMinutes} />}
            <div className={styles.meta}>
              <span>
                Responsável: <SearchHighlight query={search} text={responsibleName} />
              </span>
              <span className={styles.number}>Pedido #{order.orderNumber ?? '-'}</span>
            </div>
          </div>
          <div className={styles.client}>
            <h2>
              <Icon name="user" />
              <span>
                <SearchHighlight query={search} text={order.clientName} />
              </span>
            </h2>
            <p className={styles.phone}>
              <Icon name="phone" className={styles.phoneIcon} />
              <span>
                <span className={styles.srOnly}>Telefone: </span>
                <SearchHighlight
                  query={search}
                  text={order.phone ? formatInternationalPhone(order.phone) : 'Sem telefone'}
                />
              </span>
            </p>
          </div>
        </header>

        <div className={styles.products} aria-label="Produtos da encomenda">
          {groupProducts(order.products).map((group) => (
            <section
              className={styles.productGroup}
              data-product-category={group.category}
              key={group.category}
            >
              <h3 className={styles.category}>{group.category}</h3>
              <div className={styles.groupProducts}>
                {group.products.map((product) => (
                  <div className={styles.product} key={product.id}>
                    <div className={styles.copy}>
                      <strong>
                        <SearchHighlight
                          query={search}
                          text={product.product || 'Produto sem nome'}
                        />
                      </strong>
                      {product.notes && (
                        <small>
                          <SearchHighlight query={search} text={product.notes} />
                        </small>
                      )}
                    </div>
                    <span className={styles.quantity}>
                      <span className={styles.srOnly}>Quantidade: </span>
                      {product.quantity || 'Não indicada'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          <div className={styles.actions} aria-label="Ações da encomenda">
            <Button
              iconOnly
              className={styles.actionButton}
              variant="success"
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
              variant="success-subtle"
              aria-label="Abrir conversa no WhatsApp"
              title="Abrir conversa no WhatsApp"
              disabled={!whatsAppUrl}
              onClick={openWhatsApp}
            >
              <svg aria-hidden="true" className={styles.whatsAppIcon} viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
            </Button>
            <Button
              iconOnly
              className={styles.actionButton}
              variant="warning"
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
              className={`${styles.actionButton} ${styles.printAction}`}
              variant="secondary"
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
                className={styles.actionButton}
                variant="danger"
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
