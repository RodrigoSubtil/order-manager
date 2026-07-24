import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import {
  getSessionContext,
  type MembershipRole,
  type SessionContext,
} from '../../../shared/lib/supabaseData';
import {
  readCachedSessionContext,
  saveCachedSessionContext,
} from '../../../shared/lib/contingencyStore';
import {
  assertSupabaseConfigured,
  setSessionPersistence,
  supabase,
} from '../../../shared/lib/supabase';
import { usernameToAuthIdentity } from '../lib/authIdentity';
import type { LoginFormValues } from '../schemas/loginSchema';

type AuthUser = {
  id: string;
  tenantId: string;
  username: string;
  displayName: string;
  bakeryName: string | null;
};

function displayNameFromSession(session: { user: { user_metadata?: Record<string, unknown> } }) {
  const metadata = session.user.user_metadata ?? {};
  return (
    (typeof metadata.display_name === 'string' && metadata.display_name) ||
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.username === 'string' && metadata.username) ||
    'Utilizador'
  );
}

export function useSession() {
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [context, setContext] = useState<SessionContext | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const refreshSession = useCallback(async () => {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      setAuthUser(null);
      setContext(null);
      return;
    }

    let nextContext: SessionContext | null;
    let isUsingCachedContext = false;
    try {
      nextContext = await getSessionContext();
      if (nextContext) saveCachedSessionContext(nextContext);
    } catch (error) {
      nextContext = readCachedSessionContext(data.session.user.id);
      if (!nextContext) throw error;
      isUsingCachedContext = true;
    }
    if (!nextContext) {
      throw new Error('A sua conta não tem acesso ativo a esta empresa. Contacte o dono.');
    }

    setContext(nextContext);
    setAuthUser({
      id: data.session.user.id,
      tenantId: nextContext.tenant.id,
      username: nextContext.user.username,
      displayName: nextContext.user.displayName || displayNameFromSession(data.session),
      bakeryName: nextContext.tenant.name,
    });
    setSessionError(
      isUsingCachedContext
        ? 'Não foi possível confirmar a sessão no Supabase. Está a ser usado o contexto local da última sessão válida.'
        : '',
    );
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await refreshSession();
      } catch (error) {
        if (active) {
          setAuthUser(null);
          setContext(null);
          setSessionError(
            error instanceof Error ? error.message : 'Não foi possível verificar a sessão.',
          );
        }
      } finally {
        if (active) setIsCheckingSession(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        queryClient.clear();
      }
      void refreshSession().catch(() => {
        if (active) {
          setAuthUser(null);
          setContext(null);
        }
      });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient, refreshSession]);

  const login = useCallback(
    async (values: LoginFormValues) => {
      assertSupabaseConfigured();
      queryClient.clear();
      setSessionPersistence(values.rememberMe === true);
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToAuthIdentity(values.username),
        password: values.password,
      });
      if (error) throw new Error('Utilizador ou senha incorretos.');
      await refreshSession();
    },
    [queryClient, refreshSession],
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Não foi possível terminar sessão.');
    queryClient.clear();
    setAuthUser(null);
    setContext(null);
  }, [queryClient]);

  const role: MembershipRole | null = context?.role ?? null;

  return {
    authUser,
    isCheckingSession,
    isOwner: role === 'OWNER',
    login,
    logout,
    role,
    sessionError,
  };
}
