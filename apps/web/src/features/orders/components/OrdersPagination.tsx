import { Button } from '../../../shared/components/ui';
import styles from './OrdersPagination.module.css';

type OrdersPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function OrdersPagination({ page, pageSize, total, onPageChange }: OrdersPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav className={styles.pagination} aria-label="Paginação de encomendas">
      <span>
        {first}–{last} de {total} encomenda{total === 1 ? '' : 's'}
      </span>
      <div>
        <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span aria-current="page">
          Página {page} de {pageCount}
        </span>
        <Button disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Seguinte
        </Button>
      </div>
    </nav>
  );
}
