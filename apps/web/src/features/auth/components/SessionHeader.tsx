import { Button } from '../../../shared/components/ui';
import { appVersion } from '../../../shared/lib/appVersion';
import styles from './SessionHeader.module.css';

type SessionHeaderProps = {
  canManage?: boolean;
  managementLabel?: string;
  userDisplayName: string;
  onLogoutRequest: () => void;
  onOpenSettings: () => void;
};

export function SessionHeader({
  canManage = true,
  managementLabel = 'Gerenciar',
  userDisplayName,
  onLogoutRequest,
  onOpenSettings,
}: SessionHeaderProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brandRow}>
        <span data-eyebrow>Order Manager</span>
        <span className={styles.version}>{appVersion}</span>
      </div>

      <h1>Painel de encomendas</h1>

      <div className={styles.actions}>
        {canManage && (
          <Button className={styles.settings} variant="ghost" onClick={onOpenSettings}>
            {managementLabel}
          </Button>
        )}
        <div className={styles.session}>
          <span className={styles.userLabel} title={userDisplayName}>
            {userDisplayName}
          </span>
          <Button
            className={styles.logout}
            variant="ghost"
            aria-label="Sair"
            title="Sair"
            onClick={onLogoutRequest}
          >
            <svg
              className={styles.icon}
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.6"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </Button>
        </div>
      </div>
    </header>
  );
}
