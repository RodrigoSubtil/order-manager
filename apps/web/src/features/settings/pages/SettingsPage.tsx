import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LogoutConfirmDialog } from '../../auth/components/LogoutConfirmDialog';
import { SessionHeader } from '../../auth/components/SessionHeader';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import { CatalogManager, type ProductDraft } from '../components/CatalogManager';
import { ManagementAccessGate } from '../components/ManagementAccessGate';
import { RecoveryPanel } from '../components/RecoveryPanel';
import { ResponsiblesManager, type ResponsibleDraft } from '../components/ResponsiblesManager';
import { SettingsDeleteDialog } from '../components/SettingsDeleteDialog';
import { Alert, Button, Card, Spinner } from '../../../shared/components/ui';
import { useModalBodyClass } from '../../../shared/hooks';
import {
  readRecoveryArchive,
  recordRecoveryEvent,
  saveRecoverySnapshot,
} from '../../../shared/lib/recoveryArchive';
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
  type CatalogProductRecord,
  type ResponsibleRecord,
} from '../../../shared/lib/supabaseData';
import { downloadBackup } from '../lib/downloadBackup';
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
  const navigate = useNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const tenantId = session.authUser?.tenantId ?? '';
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
  const recoveryArchive = useQuery({
    queryKey: ['recovery-archive', tenantId],
    queryFn: () => readRecoveryArchive(tenantId),
    enabled: canLoadData && Boolean(tenantId),
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

  async function recordManagementChange(input: Parameters<typeof recordRecoveryEvent>[1]) {
    try {
      const archive = await recordRecoveryEvent(tenantId, input);
      queryClient.setQueryData(['recovery-archive', tenantId], archive);
    } catch {
      setError(
        'A alteração foi guardada no Supabase, mas o arquivo de recuperação deste dispositivo não foi atualizado.',
      );
    }
  }

  async function persistProduct() {
    setError('');
    setSuccess('');
    const before = product.id ? catalog.data?.find((item) => item.id === product.id) : undefined;
    try {
      const saved = await saveProductMutation.mutateAsync({
        id: product.id,
        version: product.version,
        name: product.name.trim(),
        category: product.category,
        defaultUnit: 'UN',
      });
      await recordManagementChange({
        resource: 'catalog-product',
        action: product.id ? 'updated' : 'created',
        resourceId: saved.id,
        ...(before ? { before } : {}),
        after: saved,
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
    const before = responsible.id
      ? responsibles.data?.find((item) => item.id === responsible.id)
      : undefined;
    try {
      const saved = await saveResponsibleMutation.mutateAsync({
        id: responsible.id,
        version: responsible.version,
        name: responsible.name.trim(),
      });
      await recordManagementChange({
        resource: 'responsible',
        action: responsible.id ? 'updated' : 'created',
        resourceId: saved.id,
        ...(before ? { before } : {}),
        after: saved,
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
        await recordManagementChange({
          resource: 'catalog-product',
          action: 'deleted',
          resourceId: pendingDelete.item.id,
          before: pendingDelete.item,
        });
        setSuccess('Produto apagado com sucesso.');
      } else {
        await deleteResponsibleMutation.mutateAsync({
          id: pendingDelete.item.id,
          version: pendingDelete.item.version,
        });
        await recordManagementChange({
          resource: 'responsible',
          action: 'deleted',
          resourceId: pendingDelete.item.id,
          before: pendingDelete.item,
        });
        setSuccess('Responsável apagado com sucesso.');
      }
      setPendingDelete(null);
      await refreshSettings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível apagar este registo.');
    }
  }

  async function createBackup() {
    setError('');
    setSuccess('');
    try {
      const serverSnapshot = await backupMutation.mutateAsync();
      let archive = recoveryArchive.data ?? null;
      try {
        archive = await saveRecoverySnapshot(tenantId, serverSnapshot);
        queryClient.setQueryData(['recovery-archive', tenantId], archive);
      } catch {
        setError('O snapshot do Supabase foi transferido, mas não ficou guardado neste navegador.');
      }
      downloadBackup(serverSnapshot, archive);
      setSuccess('Arquivo completo transferido. Guarde-o num local privado e noutro dispositivo.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível preparar o arquivo completo.',
      );
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
      canManage={false}
      userDisplayName={session.authUser.displayName}
      onLogoutRequest={() => setIsLogoutConfirmOpen(true)}
      onOpenSettings={() => undefined}
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
          <Button variant="primary" onClick={() => navigate('/')}>
            Voltar às encomendas
          </Button>
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
          onCancel={() => navigate('/')}
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
        <div>
          <span data-eyebrow>Configurações</span>
          <h1>Organize o trabalho da pastelaria</h1>
          <p>Atualize produtos, responsáveis e a cópia de recuperação num só lugar.</p>
        </div>
        <Button onClick={() => void leaveSettings()}>Voltar às encomendas</Button>
      </header>

      {success && <Alert tone="success">{success}</Alert>}
      {visibleError && <Alert tone="error">{visibleError}</Alert>}

      <section className={styles.overview} aria-label="Resumo da gestão">
        <Card as="article" className={styles.overviewCard}>
          <span>Produtos</span>
          <strong>{catalogItems.length}</strong>
        </Card>
        <Card as="article" className={styles.overviewCard}>
          <span>Responsáveis</span>
          <strong>{responsibleItems.length}</strong>
        </Card>
        <Card as="article" className={styles.overviewCard}>
          <span>Alterações guardadas</span>
          <strong>{recoveryArchive.data?.events.length ?? 0}</strong>
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

      <RecoveryPanel
        archive={recoveryArchive.data ?? null}
        isPreparing={backupMutation.isPending}
        onDownload={() => void createBackup()}
      />

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
