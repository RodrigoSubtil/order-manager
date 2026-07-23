import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SessionHeader } from '../../auth/components/SessionHeader';
import { useSession } from '../../auth/hooks/useSession';
import { LoginPage } from '../../auth/pages/LoginPage';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Spinner,
} from '../../../shared/components/ui';
import type { Category } from '../../../shared/lib/domain';
import {
  deleteCatalogProduct,
  deleteResponsible,
  listCatalogProducts,
  listResponsibles,
  saveCatalogProduct,
  saveResponsible,
  type QuantityUnit,
} from '../../../shared/lib/supabaseData';
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
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [responsible, setResponsible] = useState<ResponsibleDraft>(emptyResponsible);

  const canLoadData = Boolean(session.authUser);
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
  const isSaving =
    saveProductMutation.isPending ||
    deleteProductMutation.isPending ||
    saveResponsibleMutation.isPending ||
    deleteResponsibleMutation.isPending;

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

  if (!session.isOwner) {
    return (
      <main className={styles.shell}>
        <EmptyState
          title="Sem permissão para configurações"
          description="Apenas o OWNER pode gerir catálogo e responsáveis."
        />
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <SessionHeader
        companyDisplayName={session.authUser.bakeryName ?? 'Empresa'}
        isOwner
        role={session.role ?? ''}
        userDisplayName={session.authUser.displayName}
        onLogoutRequest={() => void session.logout()}
        onOpenSettings={() => undefined}
      />
      <div className={styles.back}>
        <Button onClick={() => navigate('/')}>Voltar às encomendas</Button>
      </div>
      <header className={styles.heading}>
        <span data-eyebrow>Configurações</span>
        <h1>Catálogo e responsáveis</h1>
        <p>Estas alterações aplicam-se à empresa associada à sua sessão.</p>
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
