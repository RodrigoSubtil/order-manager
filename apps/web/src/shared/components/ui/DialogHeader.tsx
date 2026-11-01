import styles from './DialogHeader.module.css';

type DialogHeaderProps = { title: string; titleId: string };

export function DialogHeader({ title, titleId }: DialogHeaderProps) {
  return (
    <header className={styles.header}>
      <h2 id={titleId}>{title}</h2>
    </header>
  );
}
