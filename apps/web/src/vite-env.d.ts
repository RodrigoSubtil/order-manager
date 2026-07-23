/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENABLED?: 'true' | 'false';
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
}
