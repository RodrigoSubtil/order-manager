import { describe, expect, it } from 'vitest';

import { getFormSubmissionError } from './formSubmissionError';

describe('getFormSubmissionError', () => {
  it.each([{ code: 'VERSION_CONFLICT' }, { status: 409 }, { statusCode: 409 }])(
    'recognizes optimistic concurrency conflicts',
    (error) => {
      const result = getFormSubmissionError(error, 'Falha genérica.');

      expect(result.conflict).toBe(true);
      expect(result.message).toContain('alterada por outro utilizador');
    },
  );

  it('preserves an ordinary API error message', () => {
    expect(getFormSubmissionError(new Error('Serviço indisponível.'), 'Falha genérica.')).toEqual({
      conflict: false,
      message: 'Serviço indisponível.',
    });
  });

  it('shows a customer version conflict without blaming the order', () => {
    expect(
      getFormSubmissionError(
        { code: '40001', message: 'Este cliente foi alterado por outro utilizador.' },
        'Falha.',
      ),
    ).toEqual({ conflict: true, message: 'Este cliente foi alterado por outro utilizador.' });
  });
});
