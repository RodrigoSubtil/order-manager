type ErrorLike = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

export type FormSubmissionError = {
  conflict: boolean;
  message: string;
};

export function getFormSubmissionError(
  error: unknown,
  fallbackMessage: string,
): FormSubmissionError {
  const candidate = error as ErrorLike | null;
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const serverMessage = typeof candidate?.message === 'string' ? candidate.message : '';
  const status = Number(candidate?.status ?? candidate?.statusCode);
  const conflict = code === 'VERSION_CONFLICT' || code === '40001' || status === 409;

  if (conflict) {
    return {
      conflict: true,
      message: /cliente/i.test(serverMessage)
        ? serverMessage
        : 'Esta encomenda foi alterada por outro utilizador. Recarregámos os dados; reveja as alterações antes de tentar novamente.',
    };
  }

  return {
    conflict: false,
    message:
      error instanceof Error
        ? error.message
        : typeof candidate?.message === 'string'
          ? candidate.message
          : fallbackMessage,
  };
}
