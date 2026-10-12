import { Button } from './Button';
import { Icon } from './Icon';
import styles from './DialogHeader.module.css';

type DialogHeaderProps = {
  onClose: () => void;
  title: string;
  titleId: string;
};

export function DialogHeader({ onClose, title, titleId }: DialogHeaderProps) {
  return (
    <header className={styles.header}>
      <h2 id={titleId}>{title}</h2>
      <Button
        data-autofocus
        className={styles.close}
        iconOnly
        variant="danger-subtle"
        aria-label="Fechar"
        onClick={onClose}
      >
        <Icon name="close" />
      </Button>
    </header>
  );
}
