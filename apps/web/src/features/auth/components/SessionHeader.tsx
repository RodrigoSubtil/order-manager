import { Button } from '../../../shared/components/ui';
import styles from './SessionHeader.module.css';

type SessionHeaderProps = {
  companyDisplayName: string;
  isAdmin: boolean;
  role: string;
  userDisplayName: string;
  onLogoutRequest: () => void;
  onOpenSettings: () => void;
  onOpenTenantSelector: () => void;
};

export function SessionHeader({
  companyDisplayName,
  isAdmin,
  role,
  userDisplayName,
  onLogoutRequest,
  onOpenSettings,
  onOpenTenantSelector,
}: SessionHeaderProps) {
  return (
    <header className={styles.topbar}>
      <div>
        <span data-eyebrow>Order Manager</span>
        <h1>Painel de encomendas</h1>
      </div>

      <div className={styles.actions}>
        <Button className={styles.tenant} variant="ghost" onClick={onOpenTenantSelector}>
          Empresa: {companyDisplayName}
        </Button>
        {isAdmin && (
          <Button className={styles.settings} variant="ghost" onClick={onOpenSettings}>
            Configurações
          </Button>
        )}
        <div className={styles.session}>
          <span className={styles.userLabel} title={`${userDisplayName} — ${role}`}>
            {userDisplayName} · {role}
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
