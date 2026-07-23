import {
  getAuthControllerMeQueryKey,
  getAuthControllerCsrfQueryKey,
  getTenantsControllerListMembershipsQueryKey,
  useAuthControllerCsrf,
  useAuthControllerLogin,
  useAuthControllerLogout,
  useAuthControllerRequestPasswordRecovery,
  useAuthControllerMe,
  useAuthControllerRefresh,
  useTenantsControllerAcceptInvitation,
  useTenantsControllerCreateTenant,
  useTenantsControllerListMemberships,
  useTenantsControllerSwitchTenant,
} from '@order-manager/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { getApiErrorMessage, getApiErrorStatus } from '../../../shared/lib/apiError';
import type { LoginFormValues } from '../schemas/loginSchema';

export function useSession() {
  const queryClient = useQueryClient();
  const csrf = useAuthControllerCsrf({
    query: { queryKey: getAuthControllerCsrfQueryKey(), enabled: false, retry: false },
  });
  const me = useAuthControllerMe({
    query: { queryKey: getAuthControllerMeQueryKey(), retry: false, refetchOnWindowFocus: false },
  });
  const loginMutation = useAuthControllerLogin();
  const logoutMutation = useAuthControllerLogout();
  const passwordRecoveryMutation = useAuthControllerRequestPasswordRecovery();
  const refreshMutation = useAuthControllerRefresh();
  const memberships = useTenantsControllerListMemberships({
    query: {
      queryKey: getTenantsControllerListMembershipsQueryKey(),
      enabled: Boolean(me.data),
      retry: false,
      staleTime: 30_000,
    },
  });
  const createTenantMutation = useTenantsControllerCreateTenant();
  const acceptInvitationMutation = useTenantsControllerAcceptInvitation();
  const switchTenantMutation = useTenantsControllerSwitchTenant();
  const refreshAttempted = useRef(false);
  const activeTenantId = useRef<string | null>(null);

  const ensureCsrf = useCallback(async () => {
    await csrf.refetch({ throwOnError: true });
  }, [csrf]);

  useEffect(() => {
    if (!me.isError || getApiErrorStatus(me.error) !== 401 || refreshAttempted.current) return;

    refreshAttempted.current = true;
    void (async () => {
      try {
        await ensureCsrf();
        await refreshMutation.mutateAsync();
        await me.refetch();
      } catch {
        // A query /auth/me permanece em erro 401 até um login bem-sucedido substituir o cache.
        // Removê-la aqui desmontaria o formulário enquanto o utilizador o está a preencher.
      }
    })();
  }, [ensureCsrf, me, queryClient, refreshMutation]);

  useEffect(() => {
    const nextTenantId = me.data?.tenant?.id ?? null;
    if (activeTenantId.current && activeTenantId.current !== nextTenantId) {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== '/api/v1/auth/me',
      });
    }
    activeTenantId.current = nextTenantId;
  }, [me.data?.tenant?.id, queryClient]);

  const login = useCallback(
    async (values: LoginFormValues) => {
      await ensureCsrf();
      const session = await loginMutation.mutateAsync({
        data: {
          email: values.username.trim(),
          password: values.password,
          rememberMe: values.rememberMe,
        },
      });
      refreshAttempted.current = false;
      queryClient.setQueryData(getAuthControllerMeQueryKey(), session);
    },
    [ensureCsrf, loginMutation, queryClient],
  );

  const logout = useCallback(async () => {
    await ensureCsrf();
    await logoutMutation.mutateAsync();
    activeTenantId.current = null;
    queryClient.clear();
  }, [ensureCsrf, logoutMutation, queryClient]);

  const switchTenant = useCallback(
    async (membershipId: string) => {
      await ensureCsrf();
      await switchTenantMutation.mutateAsync({ data: { membershipId } });
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== '/api/v1/auth/me',
      });
      await me.refetch({ throwOnError: true });
      await memberships.refetch({ throwOnError: true });
    },
    [ensureCsrf, me, memberships, queryClient, switchTenantMutation],
  );

  const acceptInvitation = useCallback(
    async (membershipId: string) => {
      await ensureCsrf();
      await acceptInvitationMutation.mutateAsync({ membershipId });
      await me.refetch({ throwOnError: true });
      await memberships.refetch({ throwOnError: true });
    },
    [acceptInvitationMutation, ensureCsrf, me, memberships],
  );

  const createTenant = useCallback(
    async (name: string, slug: string) => {
      await ensureCsrf();
      await createTenantMutation.mutateAsync({ data: { name, slug } });
      await me.refetch({ throwOnError: true });
      await memberships.refetch({ throwOnError: true });
    },
    [createTenantMutation, ensureCsrf, me, memberships],
  );

  const requestPasswordRecovery = useCallback(
    async (email: string) => {
      await ensureCsrf();
      await passwordRecoveryMutation.mutateAsync({ data: { email } });
    },
    [ensureCsrf, passwordRecoveryMutation],
  );

  const authUser = me.data
    ? {
        id: me.data.user.id,
        username: me.data.user.email ?? me.data.user.displayName,
        displayName: me.data.user.displayName,
        bakeryName:
          memberships.data?.items.find((item) => item.id === memberships.data?.activeMembershipId)
            ?.tenant.name ??
          me.data.tenant?.slug ??
          null,
      }
    : null;
  const isUnauthenticated = me.isError && getApiErrorStatus(me.error) === 401;
  const sessionError =
    me.isError && !isUnauthenticated
      ? getApiErrorMessage(me.error, 'Não foi possível verificar a sessão.')
      : '';

  return {
    authUser,
    acceptInvitation,
    createTenant,
    isAdmin: me.data?.role === 'OWNER' || me.data?.role === 'ADMIN',
    isCheckingSession: me.isLoading || refreshMutation.isPending,
    isTenantActionPending:
      createTenantMutation.isPending ||
      acceptInvitationMutation.isPending ||
      switchTenantMutation.isPending,
    isLoadingMemberships: memberships.isLoading,
    login,
    logout,
    memberships: memberships.data?.items ?? [],
    activeMembershipId: memberships.data?.activeMembershipId ?? null,
    requestPasswordRecovery,
    ensureCsrf,
    role: me.data?.role ?? null,
    sessionError,
    switchTenant,
    tenantSelectionRequired: Boolean(me.data?.tenantSelectionRequired || !me.data?.tenant),
  };
}
