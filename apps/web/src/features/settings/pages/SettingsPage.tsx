import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAppNavigate } from '../../../app/router/navigation';
import { LogoutConfirmDialog } from '../../auth/components/LogoutConfirmDialog';
import { SessionHeader } from '../../auth/components/SessionHeader';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import { CatalogManager, type ProductDraft } from '../components/CatalogManager';
import { ManagementAccessGate } from '../components/ManagementAccessGate';
import { ResponsiblesManager, type ResponsibleDraft } from '../components/ResponsiblesManager';
import { SettingsDeleteDialog } from '../components/SettingsDeleteDialog';
import { Alert, Card, Spinner } from '../../../shared/components/ui';
import { useModalBodyClass } from '../../../shared/hooks';
import {
  deleteCatalogProduct,
  deleteResponsible,
  getManagementAccessStatus,
  initializeManagementPassword,
  listCatalogProducts,
  listResponsibles,
  lockManagementAccess,
  saveCatalogProduct,
  saveResponsible,
  unlockManagementAccess,
  type CatalogProductRecord,
  type ResponsibleRecord,
} from '../../../shared/lib/supabaseData';
import styles from './SettingsPage.module.css';

type PendingDelete =
  | { type: 'product'; item: CatalogProductRecord }
  | { type: 'responsible'; item: ResponsibleRecord };

const emptyProduct: ProductDraft = {
  name: '',
  category: 'Pastelaria',
};
const emptyResponsible: ResponsibleDraft = { name: '' };

export default function SettingsPage() {
  const navigate = useAppNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [responsible, setResponsible] = useState<ResponsibleDraft>(emptyResponsible);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const managementStatus = useQuery({
    queryKey: ['supabase', 'management-access'],
    queryFn: getManagementAccessStatus,
    enabled: Boolean(session.authUser && session.isOwner),
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
  const isSaving =
    saveProductMutation.isPending ||
    deleteProductMutation.isPending ||
    saveResponsibleMutation.isPending ||
    deleteResponsibleMutation.isPending;
  const isCheckingManagement = managementStatus.isLoading || unlockManagementMutation.isPending;

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [success]);
  useModalBodyClass(Boolean(pendingDelete) || isLogoutConfirmOpen);

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

  async function persistProduct() {
    setError('');
    setSuccess('');
    try {
      await saveProductMutation.mutateAsync({
        id: product.id,
        version: product.version,
        name: product.name.trim(),
        category: product.category,
      });
      setProduct(emptyProduct);
      await refreshSettings();
      setSuccess(
        product.id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o produto.');
    }
  }

  async function persistResponsible() {
    setError('');
    setSuccess('');
    try {
      await saveResponsibleMutation.mutateAsync({
        id: responsible.id,
        version: responsible.version,
        name: responsible.name.trim(),
      });
      setResponsible(emptyResponsible);
      await refreshSettings();
      setSuccess(
        responsible.id
          ? 'Responsável atualizado com sucesso.'
          : 'Responsável adicionado com sucesso.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o responsável.');
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setError('');
    setSuccess('');
    try {
      if (pendingDelete.type === 'product') {
        await deleteProductMutation.mutateAsync({
          id: pendingDelete.item.id,
          version: pendingDelete.item.version,
        });
        setSuccess('Produto apagado com sucesso.');
      } else {
        await deleteResponsibleMutation.mutateAsync({
          id: pendingDelete.item.id,
          version: pendingDelete.item.version,
        });
        setSuccess('Responsável apagado com sucesso.');
      }
      setPendingDelete(null);
      await refreshSettings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível apagar este registo.');
    }
  }

  async function handleLogout() {
    setError('');
    try {
      await session.logout();
      setIsLogoutConfirmOpen(false);
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível terminar a sessão.');
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

  const header = (
    <SessionHeader
      canManage
      managementLabel="Encomendas"
      userDisplayName={session.authUser.displayName}
      onLogoutRequest={() => setIsLogoutConfirmOpen(true)}
      onOpenSettings={() => void leaveSettings()}
    />
  );

  if (!session.isOwner) {
    return (
      <main className={styles.shell}>
        {header}
        <Card as="section" className={styles.denied}>
          <span data-eyebrow>Acesso protegido</span>
          <h1>Área exclusiva do dono</h1>
          <p>O seu acesso permite trabalhar com encomendas, mas não alterar configurações.</p>
        </Card>
      </main>
    );
  }

  if (managementStatus.isLoading) {
    return (
      <main className={styles.shell}>
        {header}
        <div className={styles.loading}>
          <Spinner label="A verificar acesso gerencial" />
        </div>
      </main>
    );
  }

  if (!managementStatus.data?.unlocked) {
    return (
      <main className={styles.shell}>
        {header}
        <ManagementAccessGate
          configured={managementStatus.data?.configured ?? false}
          error={
            error || (managementStatus.error instanceof Error ? managementStatus.error.message : '')
          }
          isSubmitting={isCheckingManagement}
          onSubmit={submitManagementPassword}
        />
        {isLogoutConfirmOpen && (
          <LogoutConfirmDialog
            companyDisplayName={session.authUser.bakeryName || 'Pastelaria'}
            isSaving={false}
            onCancel={() => setIsLogoutConfirmOpen(false)}
            onConfirm={handleLogout}
          />
        )}
      </main>
    );
  }

  const visibleError =
    error ||
    (catalog.error instanceof Error ? catalog.error.message : '') ||
    (responsibles.error instanceof Error ? responsibles.error.message : '');
  const catalogItems = catalog.data ?? [];
  const responsibleItems = responsibles.data ?? [];

  return (
    <main className={styles.shell}>
      {header}
      <header className={styles.heading}>
        <h1>Gerenciamento</h1>
      </header>

      {success && <Alert tone="success">{success}</Alert>}
      {visibleError && <Alert tone="error">{visibleError}</Alert>}

      <section className={styles.overview} aria-label="Resumo do gerenciamento">
        <Card as="article" className={styles.overviewCard}>
          <span>Produtos</span>
          <strong>{catalogItems.length}</strong>
        </Card>
        <Card as="article" className={styles.overviewCard}>
          <span>Responsáveis</span>
          <strong>{responsibleItems.length}</strong>
        </Card>
      </section>

      <section className={styles.grid}>
        <CatalogManager
          draft={product}
          isLoading={catalog.isLoading}
          isSaving={isSaving}
          items={catalogItems}
          onDelete={(item) => setPendingDelete({ type: 'product', item })}
          onDraftChange={setProduct}
          onReset={() => setProduct(emptyProduct)}
          onSave={() => void persistProduct()}
        />
        <ResponsiblesManager
          draft={responsible}
          isLoading={responsibles.isLoading}
          isSaving={isSaving}
          items={responsibleItems}
          onDelete={(item) => setPendingDelete({ type: 'responsible', item })}
          onDraftChange={setResponsible}
          onReset={() => setResponsible(emptyResponsible)}
          onSave={() => void persistResponsible()}
        />
      </section>

      {pendingDelete && (
        <SettingsDeleteDialog
          isSaving={isSaving}
          itemName={pendingDelete.item.name}
          itemType={pendingDelete.type === 'product' ? 'produto' : 'responsável'}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
      {isLogoutConfirmOpen && (
        <LogoutConfirmDialog
          companyDisplayName={session.authUser.bakeryName || 'Pastelaria'}
          isSaving={false}
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleLogout}
        />
      )}
    </main>
  );
}
