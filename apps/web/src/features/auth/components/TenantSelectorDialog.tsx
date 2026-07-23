import type { MembershipResponseDto } from '@order-manager/api-client';

import { Alert, Button, Dialog, EmptyState, Spinner } from '../../../shared/components/ui';
import styles from './TenantSelectorDialog.module.css';

type TenantSelectorDialogProps = {
  activeMembershipId: string | null;
  error?: string;
  isSaving: boolean;
  memberships: MembershipResponseDto[];
  onAcceptInvitation: (membershipId: string) => void;
  onClose: () => void;
  onSelect: (membershipId: string) => void;
};

export function TenantSelectorDialog({
  activeMembershipId,
  error,
  isSaving,
  memberships,
  onAcceptInvitation,
  onClose,
  onSelect,
}: TenantSelectorDialogProps) {
  return (
    <Dialog titleId="tenant-selector-title" onClose={onClose}>
      <span data-eyebrow>Empresa ativa</span>
      <h2 id="tenant-selector-title">Escolha a empresa</h2>
      <p className={styles.copy}>Os dados carregados pertencem somente à empresa selecionada.</p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className={styles.list} aria-busy={isSaving}>
        {memberships.length === 0 ? (
          <EmptyState title="Não existem empresas disponíveis." />
        ) : (
          memberships.map((membership) => {
            const isActive = membership.status === 'ACTIVE';
            const isSelected = membership.id === activeMembershipId;
            return (
              <article className={styles.item} key={membership.id}>
                <div>
                  <strong>{membership.tenant.name}</strong>
                  <span>
                    {membership.role} · {membership.status}
                  </span>
                </div>
                {membership.status === 'INVITED' ? (
                  <Button disabled={isSaving} onClick={() => onAcceptInvitation(membership.id)}>
                    Aceitar convite
                  </Button>
                ) : (
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    disabled={!isActive || isSelected || isSaving}
                    onClick={() => onSelect(membership.id)}
                  >
                    {isSaving && !isSelected ? (
                      <Spinner label="A trocar empresa" />
                    ) : isSelected ? (
                      'Empresa atual'
                    ) : (
                      'Usar empresa'
                    )}
                  </Button>
                )}
              </article>
            );
          })
        )}
      </div>
      <div className={styles.actions}>
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </Dialog>
  );
}
