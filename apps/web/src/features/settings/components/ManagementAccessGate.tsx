import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, Button, Card, FieldError, Input } from '../../../shared/components/ui';
import {
  managementAccessSchema,
  type ManagementAccessFormValues,
} from '../schemas/managementAccessSchema';
import styles from './ManagementAccessGate.module.css';

type ManagementAccessGateProps = {
  configured: boolean;
  error: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => Promise<void>;
};

export function ManagementAccessGate({
  configured,
  error,
  isSubmitting,
  onCancel,
  onSubmit,
}: ManagementAccessGateProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ManagementAccessFormValues>({
    defaultValues: { password: '' },
    resolver: zodResolver(managementAccessSchema),
  });

  return (
    <Card as="section" className={styles.card}>
      <div className={styles.lockIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 018 0v3" />
        </svg>
      </div>
      <div className={styles.copy}>
        <span data-eyebrow>Área restrita</span>
        <h1>Gerenciar a pastelaria</h1>
        <p>Introduza a senha exclusiva dos chefes para alterar produtos e responsáveis.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form
        className={styles.form}
        onSubmit={handleSubmit((values) => onSubmit(values.password))}
        noValidate
      >
        <label htmlFor="management-password">Senha de gerenciamento</label>
        <div className={styles.passwordField}>
          <Input
            id="management-password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            aria-describedby={errors.password ? 'management-password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            autoFocus
            {...register('password')}
          />
          <button
            className={styles.visibility}
            type="button"
            aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
          >
            {isPasswordVisible ? (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.9 10.9 0 0112 4c5.5 0 9 5.5 9 5.5a15.8 15.8 0 01-2.2 2.8M6.2 6.2A16 16 0 003 9.5S6.5 15 12 15a10 10 0 003-.4" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M3 12s3.5-5.5 9-5.5 9 5.5 9 5.5-3.5 5.5-9 5.5S3 12 3 12z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
        <FieldError id="management-password-error" message={errors.password?.message} />

        {!configured && (
          <Alert tone="info">
            O acesso gerencial será configurado pela primeira vez com esta senha.
          </Alert>
        )}

        <div className={styles.actions}>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A verificar...' : 'Entrar em Gerenciar'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
