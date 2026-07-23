import { Button, Card } from '../../../shared/components/ui';
import styles from './OrderIndicators.module.css';

type OrderIndicatorsProps = {
  stats: { previous: number; today: number; upcoming: number };
  total: number;
  canDeletePrevious: boolean;
  onDeletePrevious: () => void;
};

export function OrderIndicators({
  stats,
  total,
  canDeletePrevious,
  onDeletePrevious,
}: OrderIndicatorsProps) {
  return (
    <section className={styles.grid} aria-label="Resumo das encomendas">
      <Card as="article" className={`${styles.card} ${styles.previous}`}>
        <div>
          <span>Encomendas anteriores</span>
          <strong>{stats.previous}</strong>
        </div>
        <Button
          className={styles.clean}
          variant="ghost"
          disabled={!canDeletePrevious}
          onClick={onDeletePrevious}
          aria-label="Excluir encomendas anteriores"
          title="Excluir encomendas anteriores"
        >
          Limpar
        </Button>
      </Card>
      <Card as="article" className={styles.card}>
        <span>Total de encomendas</span>
        <strong>{total}</strong>
      </Card>
      <Card as="article" className={styles.card}>
        <span>Encomendas de hoje</span>
        <strong>{stats.today}</strong>
      </Card>
      <Card as="article" className={styles.card}>
        <span>Encomendas dos próximos dias</span>
        <strong>{stats.upcoming}</strong>
      </Card>
    </section>
  );
}
