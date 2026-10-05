import { ApiErrorResponse } from '@wildlife/shared';

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: any[];
  public readonly status: number;

  constructor(message: string, code = 'INTERNAL_ERROR', status = 500, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// HTTP request helper with envelope unwrapping and error normalization
export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {

  const url = endpoint.startsWith('http')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    if (json && json.success === false && json.error) {
      const err = json as ApiErrorResponse;
      throw new ApiError(err.error.message, err.error.code, response.status, err.error.details);
    }
    throw new ApiError(
      json?.message || `HTTP error ${response.status}: ${response.statusText}`,
      'HTTP_ERROR',
      response.status
    );
  }

  // Return data payload if envelope format is detected
  if (json && typeof json === 'object' && 'success' in json && json.success === true) {
    return json.data as T;
  }

  return json as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
