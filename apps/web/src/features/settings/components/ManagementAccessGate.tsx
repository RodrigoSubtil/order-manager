import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, Button, Card, FieldError, Icon, Input } from '../../../shared/components/ui';
import {
  managementAccessSchema,
  type ManagementAccessFormValues,
} from '../schemas/managementAccessSchema';
import styles from './ManagementAccessGate.module.css';

type ManagementAccessGateProps = {
  configured: boolean;
  error: string;
  isSubmitting: boolean;
  onSubmit: (password: string) => Promise<void>;
};

export function ManagementAccessGate({
  configured,
  error,
  isSubmitting,
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
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form
        className={styles.form}
        onSubmit={handleSubmit((values) => onSubmit(values.password))}
        noValidate
      >
        <label htmlFor="management-password">Senha</label>
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
            <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} />
          </button>
        </div>
        <FieldError id="management-password-error" message={errors.password?.message} />

        {!configured && (
          <Alert tone="info">
            O acesso gerencial será configurado pela primeira vez com esta senha.
          </Alert>
        )}

        <div className={styles.actions}>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A verificar...' : 'Entrar'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
