import {
  MembershipRole,
  MembershipStatus,
  ProductCategory,
  QuantityUnit,
  getCatalogControllerListQueryKey,
  getResponsiblesControllerListQueryKey,
  getTenantsControllerListCurrentTenantMembershipsQueryKey,
  useCatalogControllerCreate,
  useCatalogControllerList,
  useCatalogControllerRemove,
  useCatalogControllerUpdate,
  useResponsiblesControllerCreate,
  useResponsiblesControllerList,
  useResponsiblesControllerRemove,
  useResponsiblesControllerUpdate,
  useTenantsControllerInvite,
  useTenantsControllerListCurrentTenantMemberships,
  useTenantsControllerManageMembership,
} from '@order-manager/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SessionHeader } from '../../auth/components/SessionHeader';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import { TenantAccessPage } from '../../auth/pages/TenantAccessPage';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Spinner,
} from '../../../shared/components/ui';
import { getApiErrorMessage } from '../../../shared/lib/apiError';
import styles from './SettingsPage.module.css';

type ProductDraft = {
  id?: string;
  version?: number;
  name: string;
  category: ProductCategory;
  unit: QuantityUnit;
};
type ResponsibleDraft = { id?: string; version?: number; name: string };

const emptyProduct: ProductDraft = {
  name: '',
  category: ProductCategory.PASTELARIA,
  unit: QuantityUnit.UN,
};
const emptyResponsible: ResponsibleDraft = { name: '' };

export default function SettingsPage() {
  const navigate = useNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [responsible, setResponsible] = useState<ResponsibleDraft>(emptyResponsible);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>(MembershipRole.OPERATOR);

  const canLoadTenantData = Boolean(session.authUser && !session.tenantSelectionRequired);
  const catalog = useCatalogControllerList(
    { page: 1, pageSize: 100, active: true },
    {
      query: {
        queryKey: getCatalogControllerListQueryKey({ page: 1, pageSize: 100, active: true }),
        enabled: canLoadTenantData,
        retry: false,
      },
    },
  );
  const responsibles = useResponsiblesControllerList(
    { page: 1, pageSize: 100, active: true },
    {
      query: {
        queryKey: getResponsiblesControllerListQueryKey({ page: 1, pageSize: 100, active: true }),
        enabled: canLoadTenantData,
        retry: false,
      },
    },
  );
  const tenantMembers = useTenantsControllerListCurrentTenantMemberships({
    query: {
      queryKey: getTenantsControllerListCurrentTenantMembershipsQueryKey(),
      enabled: Boolean(canLoadTenantData && session.isAdmin),
      retry: false,
    },
  });
  const createProduct = useCatalogControllerCreate();
  const updateProduct = useCatalogControllerUpdate();
  const removeProduct = useCatalogControllerRemove();
  const createResponsible = useResponsiblesControllerCreate();
  const updateResponsible = useResponsiblesControllerUpdate();
  const removeResponsible = useResponsiblesControllerRemove();
  const inviteMember = useTenantsControllerInvite();
  const manageMembership = useTenantsControllerManageMembership();

  const isSaving =
    createProduct.isPending ||
    updateProduct.isPending ||
    removeProduct.isPending ||
    createResponsible.isPending ||
    updateResponsible.isPending ||
    removeResponsible.isPending ||
    inviteMember.isPending ||
    manageMembership.isPending;

  function invalidateSettings() {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: getCatalogControllerListQueryKey({ page: 1, pageSize: 100, active: true }),
      }),
      queryClient.invalidateQueries({
        queryKey: getResponsiblesControllerListQueryKey({ page: 1, pageSize: 100, active: true }),
      }),
      queryClient.invalidateQueries({
        queryKey: getTenantsControllerListCurrentTenantMembershipsQueryKey(),
      }),
    ]);
  }

  async function saveProduct() {
    setError('');
    try {
      await session.ensureCsrf();
      if (product.id && product.version) {
        await updateProduct.mutateAsync({
          id: product.id,
          data: {
            version: product.version,
            name: product.name.trim(),
            category: product.category,
            defaultUnit: product.unit,
          },
        });
      } else {
        await createProduct.mutateAsync({
          data: {
            name: product.name.trim(),
            category: product.category,
            defaultUnit: product.unit,
          },
        });
      }
      setProduct(emptyProduct);
      await invalidateSettings();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Não foi possível guardar o produto.'));
    }
  }

  async function removeCatalogProduct(id: string, version: number) {
    setError('');
    try {
      await session.ensureCsrf();
      await removeProduct.mutateAsync({ id, params: { version } });
      await invalidateSettings();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Não foi possível apagar o produto.'));
    }
  }

  async function saveResponsible() {
    setError('');
    try {
      await session.ensureCsrf();
      if (responsible.id && responsible.version) {
        await updateResponsible.mutateAsync({
          id: responsible.id,
          data: { version: responsible.version, name: responsible.name.trim() },
        });
      } else {
        await createResponsible.mutateAsync({ data: { name: responsible.name.trim() } });
      }
      setResponsible(emptyResponsible);
      await invalidateSettings();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Não foi possível guardar o responsável.'));
    }
  }

  async function removeOrderResponsible(id: string, version: number) {
    setError('');
    try {
      await session.ensureCsrf();
      await removeResponsible.mutateAsync({ id, params: { version } });
      await invalidateSettings();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Não foi possível apagar o responsável.'));
    }
  }

  async function invite() {
    setError('');
    try {
      await session.ensureCsrf();
      await inviteMember.mutateAsync({ data: { email: inviteEmail.trim(), role: inviteRole } });
      setInviteEmail('');
      await invalidateSettings();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Não foi possível enviar o convite.'));
    }
  }

  async function changeMembership(
    membershipId: string,
    input: { role?: MembershipRole; status?: Exclude<MembershipStatus, 'INVITED'> },
  ) {
    setError('');
    try {
      await session.ensureCsrf();
      await manageMembership.mutateAsync({ membershipId, data: input });
      await invalidateSettings();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Não foi possível atualizar o acesso.'));
    }
  }

  if (session.isCheckingSession || !session.authUser) {
    return (
      <LoginPage
        isCheckingSession={session.isCheckingSession}
        sessionError={session.sessionError}
        onLogin={session.login}
        onRequestPasswordRecovery={session.requestPasswordRecovery}
      />
    );
  }

  if (session.tenantSelectionRequired) {
    return (
      <TenantAccessPage
        error={session.sessionError}
        isSaving={isSaving}
        memberships={session.memberships}
        onAcceptInvitation={session.acceptInvitation}
        onCreateTenant={session.createTenant}
        onSelectTenant={session.switchTenant}
      />
    );
  }

  if (!session.isAdmin) {
    return (
      <main className={styles.shell}>
        <EmptyState
          title="Sem permissão para configurações"
          description="Peça a um OWNER ou ADMIN para gerir esta empresa."
        />
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <SessionHeader
        companyDisplayName={session.authUser.bakeryName ?? 'Empresa'}
        isAdmin
        role={session.role ?? ''}
        userDisplayName={session.authUser.displayName}
        onLogoutRequest={() => void session.logout()}
        onOpenSettings={() => undefined}
        onOpenTenantSelector={() => navigate('/')}
      />
      <div className={styles.back}>
        <Button onClick={() => navigate('/')}>Voltar às encomendas</Button>
      </div>
      <header className={styles.heading}>
        <span data-eyebrow>Administração</span>
        <h1>Configurações da empresa</h1>
        <p>As alterações aplicam-se apenas à empresa ativa.</p>
      </header>
      {error && <Alert tone="error">{error}</Alert>}

      <section className={styles.grid}>
        <Card as="section" className={styles.card}>
          <h2>{product.id ? 'Editar produto' : 'Novo produto'}</h2>
          <label>
            Nome
            <Input
              value={product.name}
              onChange={(event) => setProduct({ ...product, name: event.target.value })}
            />
          </label>
          <label>
            Categoria
            <Select
              value={product.category}
              onChange={(event) =>
                setProduct({ ...product, category: event.target.value as ProductCategory })
              }
            >
              <option value={ProductCategory.PASTELARIA}>Pastelaria</option>
              <option value={ProductCategory.PADARIA}>Padaria</option>
              <option value={ProductCategory.SALGADOS}>Salgados</option>
            </Select>
          </label>
          <label>
            Unidade
            <Select
              value={product.unit}
              onChange={(event) =>
                setProduct({ ...product, unit: event.target.value as QuantityUnit })
              }
            >
              <option value={QuantityUnit.UN}>UN</option>
              <option value={QuantityUnit.KG}>KG</option>
              <option value={QuantityUnit.G}>G</option>
            </Select>
          </label>
          <div className={styles.inline}>
            <Button onClick={() => setProduct(emptyProduct)}>Limpar</Button>
            <Button
              variant="primary"
              disabled={isSaving || !product.name.trim()}
              onClick={() => void saveProduct()}
            >
              {isSaving ? 'A guardar...' : 'Guardar produto'}
            </Button>
          </div>
          <div className={styles.items}>
            {catalog.isLoading ? (
              <Spinner label="A carregar catálogo" />
            ) : (
              catalog.data?.items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <span>
                    {item.name} · {item.category}
                  </span>
                  <div>
                    <Button
                      onClick={() =>
                        setProduct({
                          id: item.id,
                          version: item.version,
                          name: item.name,
                          category: item.category,
                          unit: item.defaultUnit,
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      disabled={isSaving}
                      onClick={() => void removeCatalogProduct(item.id, item.version)}
                    >
                      Apagar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card as="section" className={styles.card}>
          <h2>{responsible.id ? 'Editar responsável' : 'Novo responsável'}</h2>
          <label>
            Nome
            <Input
              value={responsible.name}
              onChange={(event) => setResponsible({ ...responsible, name: event.target.value })}
            />
          </label>
          <div className={styles.inline}>
            <Button onClick={() => setResponsible(emptyResponsible)}>Limpar</Button>
            <Button
              variant="primary"
              disabled={isSaving || !responsible.name.trim()}
              onClick={() => void saveResponsible()}
            >
              {isSaving ? 'A guardar...' : 'Guardar responsável'}
            </Button>
          </div>
          <div className={styles.items}>
            {responsibles.isLoading ? (
              <Spinner label="A carregar responsáveis" />
            ) : (
              responsibles.data?.items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <span>{item.name}</span>
                  <div>
                    <Button
                      onClick={() =>
                        setResponsible({ id: item.id, version: item.version, name: item.name })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      disabled={isSaving}
                      onClick={() => void removeOrderResponsible(item.id, item.version)}
                    >
                      Apagar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card as="section" className={`${styles.card} ${styles.members}`}>
          <h2>Utilizadores e papéis</h2>
          <label>
            Email
            <Input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </label>
          <label>
            Papel
            <Select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as MembershipRole)}
            >
              <option value={MembershipRole.ADMIN}>ADMIN</option>
              <option value={MembershipRole.OPERATOR}>OPERATOR</option>
              {session.role === MembershipRole.OWNER && (
                <option value={MembershipRole.OWNER}>OWNER</option>
              )}
            </Select>
          </label>
          <Button
            variant="primary"
            disabled={isSaving || !inviteEmail.trim()}
            onClick={() => void invite()}
          >
            {isSaving ? 'A enviar...' : 'Convidar utilizador'}
          </Button>
          <div className={styles.items}>
            {tenantMembers.isLoading ? (
              <Spinner label="A carregar utilizadores" />
            ) : (
              tenantMembers.data?.items.map((item) => {
                const canManageOwner =
                  session.role === MembershipRole.OWNER || item.role !== MembershipRole.OWNER;
                const canChange = canManageOwner && item.id !== session.activeMembershipId;

                return (
                  <div key={item.id} className={styles.member}>
                    <div>
                      <strong>{item.user.displayName}</strong>
                      <span>{item.user.email ?? 'Email não disponível'}</span>
                      <small>{item.status}</small>
                    </div>
                    <Select
                      aria-label={`Papel de ${item.user.displayName}`}
                      value={item.role}
                      disabled={!canChange || isSaving}
                      onChange={(event) =>
                        void changeMembership(item.id, {
                          role: event.target.value as MembershipRole,
                        })
                      }
                    >
                      <option value={MembershipRole.ADMIN}>ADMIN</option>
                      <option value={MembershipRole.OPERATOR}>OPERATOR</option>
                      {session.role === MembershipRole.OWNER && (
                        <option value={MembershipRole.OWNER}>OWNER</option>
                      )}
                    </Select>
                    {item.status === MembershipStatus.ACTIVE ? (
                      <Button
                        variant="danger"
                        disabled={!canChange || isSaving}
                        onClick={() =>
                          void changeMembership(item.id, { status: MembershipStatus.SUSPENDED })
                        }
                      >
                        Suspender
                      </Button>
                    ) : (
                      <Button
                        disabled={
                          !canChange || isSaving || item.status === MembershipStatus.REVOKED
                        }
                        onClick={() =>
                          void changeMembership(item.id, { status: MembershipStatus.ACTIVE })
                        }
                      >
                        Ativar
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}
