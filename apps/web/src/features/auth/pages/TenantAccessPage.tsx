import type { MembershipResponseDto } from '@order-manager/api-client';
import { useState } from 'react';

import { Alert, Button, Card, FieldError, Input } from '../../../shared/components/ui';
import styles from './TenantAccessPage.module.css';

type TenantAccessPageProps = {
  error?: string;
  isSaving: boolean;
  memberships: MembershipResponseDto[];
  onAcceptInvitation: (membershipId: string) => Promise<void>;
  onCreateTenant: (name: string, slug: string) => Promise<void>;
  onSelectTenant: (membershipId: string) => Promise<void>;
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function TenantAccessPage({
  error,
  isSaving,
  memberships,
  onAcceptInvitation,
  onCreateTenant,
  onSelectTenant,
}: TenantAccessPageProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [formError, setFormError] = useState('');
  const active = memberships.filter((membership) => membership.status === 'ACTIVE');
  const invited = memberships.filter((membership) => membership.status === 'INVITED');
  const blocked = memberships.filter(
    (membership) => membership.status === 'SUSPENDED' || membership.status === 'REVOKED',
  );

  async function createTenant() {
    const normalizedName = name.trim();
    const normalizedSlug = slugify(slug || normalizedName);
    if (normalizedName.length < 2 || normalizedSlug.length < 2) {
      setFormError('Informe o nome da empresa e um identificador válido.');
      return;
    }
    setFormError('');
    await onCreateTenant(normalizedName, normalizedSlug);
  }

  return (
    <main className={styles.shell}>
      <Card as="section" className={styles.card}>
        <span data-eyebrow>Order Manager</span>
        <h1>Escolha uma empresa</h1>
        <p>
          O acesso é separado por empresa. O sistema nunca aceita uma empresa escolhida pelo
          browser.
        </p>
        {(error || formError) && <Alert tone="error">{error || formError}</Alert>}

        {active.length > 0 && (
          <section className={styles.section} aria-label="Empresas disponíveis">
            <h2>Empresas disponíveis</h2>
            {active.map((membership) => (
              <Button
                key={membership.id}
                disabled={isSaving}
                onClick={() => void onSelectTenant(membership.id)}
              >
                {membership.tenant.name} · {membership.role}
              </Button>
            ))}
          </section>
        )}

        {invited.length > 0 && (
          <section className={styles.section} aria-label="Convites pendentes">
            <h2>Convites pendentes</h2>
            {invited.map((membership) => (
              <Button
                key={membership.id}
                disabled={isSaving}
                onClick={() => void onAcceptInvitation(membership.id)}
              >
                Aceitar convite de {membership.tenant.name}
              </Button>
            ))}
          </section>
        )}

        {active.length === 0 && invited.length === 0 && blocked.length > 0 && (
          <Alert tone="info">
            A sua membership está suspensa ou revogada. Contacte um administrador.
          </Alert>
        )}

        {active.length === 0 && (
          <section className={styles.section} aria-label="Criar empresa">
            <h2>Criar uma empresa</h2>
            <p>Use este fluxo somente se a sua organização autorizou criação de empresas.</p>
            <label htmlFor="tenant-name">
              Nome da empresa
              <Input
                id="tenant-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label htmlFor="tenant-slug">
              Identificador da empresa
              <Input
                id="tenant-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder={slugify(name) || 'minha-empresa'}
              />
            </label>
            <FieldError id="tenant-form-error" message={formError} />
            <Button variant="primary" disabled={isSaving} onClick={() => void createTenant()}>
              {isSaving ? 'A criar...' : 'Criar empresa'}
            </Button>
          </section>
        )}
      </Card>
    </main>
  );
}
