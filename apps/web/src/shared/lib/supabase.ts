import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const rememberSessionKey = 'order-manager:remember-session';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(kind: 'local' | 'session'): BrowserStorage | null {
  if (typeof window === 'undefined') return null;
  return kind === 'local' ? window.localStorage : window.sessionStorage;
}

function shouldRememberSession() {
  return getStorage('local')?.getItem(rememberSessionKey) === 'true';
}

const sessionStorageAdapter: BrowserStorage = {
  getItem(key) {
    return getStorage(shouldRememberSession() ? 'local' : 'session')?.getItem(key) ?? null;
  },
  setItem(key, value) {
    getStorage(shouldRememberSession() ? 'local' : 'session')?.setItem(key, value);
  },
  removeItem(key) {
    getStorage('local')?.removeItem(key);
    getStorage('session')?.removeItem(key);
  },
};

/** Define if the next authenticated session survives the browser closing. */
export function setSessionPersistence(remember: boolean) {
  const local = getStorage('local');
  const session = getStorage('session');
  if (remember) {
    local?.setItem(rememberSessionKey, 'true');
    session?.removeItem(rememberSessionKey);
    return;
  }
  local?.removeItem(rememberSessionKey);
  session?.setItem(rememberSessionKey, 'false');
}

export function assertSupabaseConfigured() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente da aplicação.');
  }
}

/**
 * Esta é a única credencial Supabase presente no browser: a chave pública anon.
 * A segurança das operações é aplicada no PostgreSQL/RLS e nas RPCs; nunca use
 * service_role, DATABASE_URL ou passwords neste cliente.
 */
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: sessionStorageAdapter,
    },
  },
);
