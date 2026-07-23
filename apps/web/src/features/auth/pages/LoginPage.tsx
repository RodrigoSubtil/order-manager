import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

import { Alert, Button, Card, FieldError, Input, Spinner } from '../../../shared/components/ui';
import { loginSchema, type LoginFormValues } from '../schemas/loginSchema';
import {
  passwordRecoverySchema,
  type PasswordRecoveryFormValues,
} from '../schemas/passwordRecoverySchema';
import styles from './LoginPage.module.css';

type LoginPageProps = {
  isCheckingSession: boolean;
  sessionError: string;
  onLogin: (values: LoginFormValues) => Promise<void>;
  onRequestPasswordRecovery: (email: string) => Promise<void>;
};

export function LoginPage({
  isCheckingSession,
  sessionError,
  onLogin,
  onRequestPasswordRecovery,
}: LoginPageProps) {
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const {
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: { username: '', password: '', rememberMe: false },
    resolver: zodResolver(loginSchema),
    shouldFocusError: true,
  });
  const recovery = useForm<PasswordRecoveryFormValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(passwordRecoverySchema),
    shouldFocusError: true,
  });

  async function submit(values: LoginFormValues) {
    clearErrors('root');
    try {
      await onLogin(values);
    } catch (error) {
      setError('root.api', {
        message: error instanceof Error ? error.message : 'Não foi possível iniciar sessão.',
      });
    }
  }

  async function submitRecovery(values: PasswordRecoveryFormValues) {
    recovery.clearErrors('root');
    setRecoveryMessage('');
    try {
      await onRequestPasswordRecovery(values.email);
      setRecoveryMessage('Se a conta existir, receberá instruções de recuperação no email.');
    } catch (error) {
      recovery.setError('root.api', {
        message: error instanceof Error ? error.message : 'Não foi possível pedir a recuperação.',
      });
    }
  }

  if (isCheckingSession) {
    return (
      <main className={styles.shell}>
        <Card as="section" className={styles.card} aria-live="polite" aria-busy="true">
          <div className={`${styles.brand} ${styles.loading}`}>
            <span data-eyebrow>Order Manager</span>
            <Spinner label="A verificar a sessão" />
            <h1>A carregar sessão</h1>
            <p>A verificar o acesso ao painel.</p>
          </div>
        </Card>
      </main>
    );
  }

  const submissionError = errors.root?.api?.message || sessionError;

  return (
    <main className={styles.shell}>
      <Card as="section" className={styles.card}>
        <div className={styles.brand}>
          <span data-eyebrow>Order Manager</span>
          <h1>Entrar no painel</h1>
          <p>Acesso reservado para utilizadores autorizados.</p>
        </div>

        <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
          <div data-form-field>
            <label htmlFor="login-email">
              Email
              <Input
                id="login-email"
                className={styles.input}
                {...register('username')}
                aria-describedby={errors.username ? 'login-email-error' : undefined}
                aria-invalid={Boolean(errors.username)}
                placeholder="Digite o email"
                autoComplete="username"
              />
            </label>
            <FieldError id="login-email-error" message={errors.username?.message} />
          </div>

          <div data-form-field>
            <label htmlFor="login-password">
              Palavra-passe
              <Input
                id="login-password"
                className={styles.input}
                {...register('password')}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                aria-invalid={Boolean(errors.password)}
                type="password"
                placeholder="Digite a palavra-passe"
                autoComplete="current-password"
              />
            </label>
            <FieldError id="login-password-error" message={errors.password?.message} />
          </div>

          <label className={styles.rememberMe} htmlFor="login-remember-me">
            <input id="login-remember-me" type="checkbox" {...register('rememberMe')} />
            <span>Manter-me ligado neste dispositivo</span>
          </label>

          {submissionError && <Alert tone="error">{submissionError}</Alert>}

          <Button className={styles.submit} variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A entrar...' : 'Entrar'}
          </Button>
          <Button
            className={styles.recoveryToggle}
            variant="ghost"
            onClick={() => setIsRecoveryOpen(true)}
          >
            Esqueci a palavra-passe
          </Button>
        </form>

        {isRecoveryOpen && (
          <form
            className={styles.recovery}
            noValidate
            onSubmit={recovery.handleSubmit(submitRecovery)}
          >
            <h2>Recuperar acesso</h2>
            <p>Enviaremos instruções para o email informado, se a conta existir.</p>
            <label htmlFor="recovery-email">
              Email
              <Input
                id="recovery-email"
                {...recovery.register('email')}
                aria-describedby={
                  recovery.formState.errors.email ? 'recovery-email-error' : undefined
                }
                aria-invalid={Boolean(recovery.formState.errors.email)}
                autoComplete="email"
              />
            </label>
            <FieldError
              id="recovery-email-error"
              message={recovery.formState.errors.email?.message}
            />
            {recovery.formState.errors.root?.api?.message && (
              <Alert tone="error">{recovery.formState.errors.root.api.message}</Alert>
            )}
            {recoveryMessage && <Alert role="status">{recoveryMessage}</Alert>}
            <div className={styles.recoveryActions}>
              <Button onClick={() => setIsRecoveryOpen(false)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={recovery.formState.isSubmitting}>
                {recovery.formState.isSubmitting ? 'A enviar...' : 'Enviar instruções'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}
