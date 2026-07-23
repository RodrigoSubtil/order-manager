export type ApiFetchOptions<TBody = unknown> = {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  data?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

declare global {
  var __ORDER_MANAGER_API_BASE_URL__: string | undefined;
}

export type ApiRequestError = Error & {
  code?: string;
  details?: unknown;
  status: number;
  traceId?: string;
};

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function isSafeMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function createRequestError(status: number, payload: unknown): ApiRequestError {
  const candidate = payload as {
    code?: unknown;
    details?: unknown;
    message?: unknown;
    traceId?: unknown;
  } | null;
  const message =
    typeof candidate?.message === 'string' ? candidate.message : 'API request failed.';
  const error = new Error(message) as ApiRequestError;
  error.status = status;
  error.code = typeof candidate?.code === 'string' ? candidate.code : undefined;
  error.details = candidate?.details;
  error.traceId = typeof candidate?.traceId === 'string' ? candidate.traceId : undefined;
  return error;
}

function createRequestId(): string | undefined {
  return globalThis.crypto?.randomUUID?.();
}

export const apiFetch = async <TResponse, TBody = unknown>({
  url,
  method,
  params,
  data,
  headers,
  signal,
}: ApiFetchOptions<TBody>): Promise<TResponse> => {
  if (url !== '/api/v1' && !url.startsWith('/api/v1/')) {
    throw new Error(`Browser API requests must use the /api/v1 boundary: ${url}`);
  }
  const apiBaseUrl =
    globalThis.__ORDER_MANAGER_API_BASE_URL__ ?? globalThis.location?.origin ?? 'http://localhost';
  const target = new URL(url, apiBaseUrl);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) target.searchParams.set(key, String(value));
  });
  const requestHeaders = new Headers({
    Accept: 'application/json',
    ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...headers,
  });
  const requestId = createRequestId();
  if (requestId && !requestHeaders.has('X-Request-Id')) {
    requestHeaders.set('X-Request-Id', requestId);
  }
  const csrfToken = readCookie('om_csrf_token');
  if (!isSafeMethod(method) && csrfToken && !requestHeaders.has('X-CSRF-Token')) {
    requestHeaders.set('X-CSRF-Token', csrfToken);
  }
  const response = await fetch(target, {
    method,
    credentials: 'include',
    signal,
    headers: requestHeaders,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createRequestError(response.status, payload);
  }
  return response.status === 204
    ? (undefined as TResponse)
    : ((await response.json()) as TResponse);
};
