import { describe, expect, it } from 'vitest';

import { getApiErrorMessage } from './apiError';

describe('getApiErrorMessage', () => {
  it.each([
    [401, 'A sua sessão terminou. Entre novamente.'],
    [403, 'Não tem permissão para executar esta operação.'],
    [404, 'O registo já não foi encontrado.'],
    [409, 'Este registo foi alterado por outro utilizador. Recarregue os dados e tente novamente.'],
  ])('translates HTTP %s into an actionable UI message', (status, expected) => {
    expect(getApiErrorMessage({ status }, 'Fallback')).toBe(expected);
  });
});
