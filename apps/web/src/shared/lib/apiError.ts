import type { ApiRequestError } from '@order-manager/api-client';

export function getApiErrorStatus(error: unknown): number | undefined {
  const candidate = error as Partial<ApiRequestError> | null;
  return typeof candidate?.status === 'number' ? candidate.status : undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const status = getApiErrorStatus(error);
  if (status === 401) return 'A sua sessão terminou. Entre novamente.';
  if (status === 403) return 'Não tem permissão para executar esta operação.';
  if (status === 404) return 'O registo já não foi encontrado.';
  if (status === 409) {
    return 'Este registo foi alterado por outro utilizador. Recarregue os dados e tente novamente.';
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
