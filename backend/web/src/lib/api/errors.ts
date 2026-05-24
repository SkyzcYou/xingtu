export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorPayload {
  error?: unknown;
  message?: unknown;
}

export function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const data = payload as ErrorPayload;
  if (typeof data.error === 'string') return data.error;
  if (data.error && typeof data.error === 'object') {
    const error = data.error as { message?: unknown };
    if (typeof error.message === 'string') return error.message;
  }
  if (typeof data.message === 'string') return data.message;
  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
