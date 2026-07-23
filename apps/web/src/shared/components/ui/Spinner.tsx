import styles from './Spinner.module.css';

export type SpinnerProps = {
  label?: string;
};

export function Spinner({ label = 'A carregar' }: SpinnerProps) {
  return <span className={styles.spinner} role="status" aria-label={label} />;
}
