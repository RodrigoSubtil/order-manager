import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

import { Alert, Button, Card, FieldError, Input, Spinner } from '../../../shared/components/ui';
import { loginSchema, type LoginFormValues } from '../schemas/loginSchema';
import styles from './LoginPage.module.css';

type LoginPageProps = {
  isCheckingSession: boolean;
  sessionError: string;
  onLogin: (values: LoginFormValues) => Promise<void>;
};

export function LoginPage({ isCheckingSession, sessionError, onLogin }: LoginPageProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
            <label htmlFor="login-username">
              Utilizador
              <Input
                id="login-username"
                className={styles.input}
                {...register('username')}
                aria-describedby={errors.username ? 'login-username-error' : undefined}
                aria-invalid={Boolean(errors.username)}
                placeholder="Digite o utilizador"
                autoComplete="username"
              />
            </label>
            <FieldError id="login-username-error" message={errors.username?.message} />
          </div>

          <div data-form-field>
            <label htmlFor="login-password">Senha</label>
            <div className={styles.passwordInput}>
              <Input
                id="login-password"
                className={styles.input}
                {...register('password')}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                aria-invalid={Boolean(errors.password)}
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="Digite a senha"
                autoComplete="current-password"
              />
              <button
                className={styles.passwordVisibility}
                type="button"
                aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
              >
                {isPasswordVisible ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5.5 9 5.5a15.2 15.2 0 0 1-2.2 2.9M6.2 6.2C4.1 7.6 3 9.5 3 9.5S6.5 15 12 15c1 0 2-.2 2.8-.5" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M3 9.5S6.5 4 12 4s9 5.5 9 5.5S17.5 15 12 15 3 9.5 3 9.5Z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
            <FieldError id="login-password-error" message={errors.password?.message} />
          </div>

          <div className={styles.loginOptions}>
            <label className={styles.rememberMe} htmlFor="login-remember-me">
              <input id="login-remember-me" type="checkbox" {...register('rememberMe')} />
              <span className={styles.checkbox} aria-hidden="true" />
              <span className={styles.rememberLabel}>Manter conectado</span>
            </label>
          </div>

          {submissionError && <Alert tone="error">{submissionError}</Alert>}

          <Button className={styles.submit} variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A entrar...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
