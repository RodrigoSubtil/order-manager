import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SessionHeader } from '../../auth/components/SessionHeader';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import { ManagementAccessGate } from '../components/ManagementAccessGate';
import { Alert, Button, Card, Input, Select, Spinner } from '../../../shared/components/ui';
import type { Category } from '../../../shared/lib/domain';
import {
  deleteCatalogProduct,
  deleteResponsible,
  exportTenantBackup,
  getManagementAccessStatus,
  initializeManagementPassword,
  listCatalogProducts,
  listResponsibles,
  lockManagementAccess,
  saveCatalogProduct,
  saveResponsible,
  unlockManagementAccess,
  type QuantityUnit,
} from '../../../shared/lib/supabaseData';
import { downloadBackup } from '../lib/downloadBackup';
import styles from './SettingsPage.module.css';

type ProductDraft = {
  id?: string;
  version?: number;
  name: string;
  category: Category;
  unit: QuantityUnit;
};
type ResponsibleDraft = { id?: string; version?: number; name: string };

const emptyProduct: ProductDraft = {
  name: '',
  category: 'Pastelaria',
  unit: 'UN',
};
const emptyResponsible: ResponsibleDraft = { name: '' };

export default function SettingsPage() {
  const navigate = useNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [responsible, setResponsible] = useState<ResponsibleDraft>(emptyResponsible);

  const canCheckManagement = Boolean(session.authUser);
  const managementStatus = useQuery({
    queryKey: ['supabase', 'management-access'],
    queryFn: getManagementAccessStatus,
    enabled: canCheckManagement,
    retry: false,
  });
  const canLoadData = Boolean(managementStatus.data?.unlocked);
  const catalog = useQuery({
    queryKey: ['supabase', 'catalog'],
    queryFn: listCatalogProducts,
    enabled: canLoadData,
    retry: false,
  });
  const responsibles = useQuery({
    queryKey: ['supabase', 'responsibles'],
    queryFn: listResponsibles,
    enabled: canLoadData,
    retry: false,
  });
  const saveProductMutation = useMutation({ mutationFn: saveCatalogProduct });
  const deleteProductMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      deleteCatalogProduct(id, version),
  });
  const saveResponsibleMutation = useMutation({ mutationFn: saveResponsible });
  const deleteResponsibleMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      deleteResponsible(id, version),
  });
  const unlockManagementMutation = useMutation({
    mutationFn: ({ initialize, password }: { initialize: boolean; password: string }) =>
      initialize ? initializeManagementPassword(password) : unlockManagementAccess(password),
  });
  const lockManagementMutation = useMutation({ mutationFn: lockManagementAccess });
  const backupMutation = useMutation({ mutationFn: exportTenantBackup });
  const isSaving =
    saveProductMutation.isPending ||
    deleteProductMutation.isPending ||
    saveResponsibleMutation.isPending ||
    deleteResponsibleMutation.isPending ||
    backupMutation.isPending;
  const isCheckingManagement = managementStatus.isLoading || unlockManagementMutation.isPending;

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function submitManagementPassword(password: string) {
    setError('');
    try {
      const nextStatus = await unlockManagementMutation.mutateAsync({
        initialize: !managementStatus.data?.configured,
        password,
      });
      queryClient.setQueryData(['supabase', 'management-access'], nextStatus);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível validar a senha de gerenciamento.',
      );
    }
  }

  async function leaveSettings() {
    try {
      if (managementStatus.data?.unlocked) {
        await lockManagementMutation.mutateAsync();
        queryClient.setQueryData(['supabase', 'management-access'], {
          configured: true,
          unlocked: false,
          unlockedUntil: null,
        });
      }
    } finally {
      navigate('/');
    }
  }

  async function refreshSettings() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['supabase', 'catalog'] }),
      queryClient.invalidateQueries({ queryKey: ['supabase', 'responsibles'] }),
    ]);
  }

  async function saveProduct() {
    setError('');
    try {
      await saveProductMutation.mutateAsync({
        id: product.id,
        version: product.version,
        name: product.name.trim(),
        category: product.category,
        defaultUnit: product.unit,
      });
      setProduct(emptyProduct);
      await refreshSettings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o produto.');
    }
  }

  async function removeCatalogProduct(id: string, version: number) {
    setError('');
    try {
      await deleteProductMutation.mutateAsync({ id, version });
      await refreshSettings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível apagar o produto.');
    }
  }

  async function persistResponsible() {
    setError('');
    try {
      await saveResponsibleMutation.mutateAsync({
        id: responsible.id,
        version: responsible.version,
        name: responsible.name.trim(),
      });
      setResponsible(emptyResponsible);
      await refreshSettings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o responsável.');
    }
  }

  async function removeOrderResponsible(id: string, version: number) {
    setError('');
    try {
      await deleteResponsibleMutation.mutateAsync({ id, version });
      await refreshSettings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível apagar o responsável.');
    }
  }

  async function createBackup() {
    setError('');
    setSuccess('');
    try {
      const backup = await backupMutation.mutateAsync();
      downloadBackup(backup);
      setSuccess(
        'Backup transferido. Guarde o ficheiro num local privado e fora deste computador.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o backup.');
    }
  }

  if (session.isCheckingSession || !session.authUser) {
    return (
      <LoginPage
        isCheckingSession={session.isCheckingSession}
        sessionError={session.sessionError}
        onLogin={async (values) => {
          await session.login(values);
          navigate('/', { replace: true });
        }}
      />
    );
  }

  if (managementStatus.isLoading) {
    return (
      <main className={styles.shell}>
        <SessionHeader
          userDisplayName={session.authUser.displayName}
          onLogoutRequest={() => void session.logout()}
          onOpenSettings={() => undefined}
        />
        <div className={styles.loading}>
          <Spinner label="A verificar acesso gerencial" />
        </div>
      </main>
    );
  }

  if (!managementStatus.data?.unlocked) {
    return (
      <main className={styles.shell}>
        <SessionHeader
          userDisplayName={session.authUser.displayName}
          onLogoutRequest={() => void session.logout()}
          onOpenSettings={() => undefined}
        />
        <ManagementAccessGate
          configured={managementStatus.data?.configured ?? false}
          error={
            error || (managementStatus.error instanceof Error ? managementStatus.error.message : '')
          }
          isSubmitting={isCheckingManagement}
          onCancel={() => navigate('/')}
          onSubmit={submitManagementPassword}
        />
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <SessionHeader
        userDisplayName={session.authUser.displayName}
        onLogoutRequest={() => void session.logout()}
        onOpenSettings={() => undefined}
      />
      <div className={styles.back}>
        <Button onClick={() => void leaveSettings()}>Voltar às encomendas</Button>
      </div>
      <header className={styles.heading}>
        <span data-eyebrow>Gerenciar</span>
        <h1>Catálogo e responsáveis</h1>
        <p>Estas alterações aplicam-se à empresa associada à sua sessão.</p>
      </header>
      {success && <Alert tone="success">{success}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <section className={styles.grid}>
        <Card as="section" className={`${styles.card} ${styles.backup}`}>
          <div>
            <span data-eyebrow>Proteção de dados</span>
            <h2>Cópia de segurança</h2>
          </div>
          <p>
            Transfira uma cópia dos dados da pastelaria e guarde-a num armazenamento privado fora
            deste computador. O ficheiro contém dados pessoais de clientes e não deve ser enviado
            por e-mail nem colocado numa pasta pública.
          </p>
          <div className={styles.inline}>
            <small>
              Recomendado: no fim de cada dia de trabalho e antes de alterações importantes.
            </small>
            <Button
              variant="primary"
              disabled={backupMutation.isPending}
              onClick={() => void createBackup()}
            >
              {backupMutation.isPending ? 'A preparar backup...' : 'Transferir backup agora'}
            </Button>
          </div>
        </Card>

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
                setProduct({ ...product, category: event.target.value as Category })
              }
            >
              <option value="Pastelaria">Pastelaria</option>
              <option value="Padaria">Padaria</option>
              <option value="Salgados">Salgados</option>
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
              <option value="UN">UN</option>
              <option value="KG">KG</option>
              <option value="G">G</option>
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
              catalog.data?.map((item) => (
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
              onClick={() => void persistResponsible()}
            >
              {isSaving ? 'A guardar...' : 'Guardar responsável'}
            </Button>
          </div>
          <div className={styles.items}>
            {responsibles.isLoading ? (
              <Spinner label="A carregar responsáveis" />
            ) : (
              responsibles.data?.map((item) => (
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
      </section>
    </main>
  );
}
