import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeFrontendSentry } from './observability/sentry';

globalThis.__ORDER_MANAGER_API_BASE_URL__ = import.meta.env.VITE_API_BASE_URL;
initializeFrontendSentry();

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
