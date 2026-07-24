import { Card } from '../../../shared/components/ui';
import styles from './OrderIndicators.module.css';

type OrderIndicatorsProps = {
  stats: { today: number; upcoming: number };
  total: number;
};

export function OrderIndicators({ stats, total }: OrderIndicatorsProps) {
  return (
    <section className={styles.grid} aria-label="Resumo das encomendas">
      <Card as="article" className={`${styles.card} ${styles.total}`}>
        <span>Total encomendas</span>
        <strong>{total}</strong>
      </Card>
      <Card as="article" className={styles.card}>
        <span>Para hoje</span>
        <strong>{stats.today}</strong>
      </Card>
      <Card as="article" className={styles.card}>
        <span>Próximos dias</span>
        <strong>{stats.upcoming}</strong>
      </Card>
    </section>
  );
}
