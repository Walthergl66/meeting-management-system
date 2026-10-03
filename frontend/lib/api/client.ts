import type {
  ApiErrorDetail,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from '@/lib/shared';
import { tokenStore } from '@/lib/auth/token-store';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type QueryValue = string | number | boolean | null | undefined | Date;

export function buildQuery(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    searchParams.append(key, value instanceof Date ? value.toISOString() : String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function request<T>(
  path: string,
  init: RequestInit & { raw?: boolean } = {},
): Promise<T> {
  const token = tokenStore.hydrate();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload ?? {}) as Partial<ApiErrorResponse>;
    throw new ApiError(
      response.status,
      error.message ?? 'Ocurrió un error inesperado',
      error.details ?? [],
    );
  }

  return payload as T;
}

/**
 * Un 204 no trae envelope: request devuelve undefined en ese caso y leer
 * payload.data a ciegas reventaba con "Cannot read properties of undefined".
 * El backend hoy responde siempre 200 con cuerpo, pero un 204 es una
 * respuesta legítima y el cliente no debe romperse si llega.
 */
function unwrap<T>(payload: ApiSuccessResponse<T> | undefined): T {
  return payload?.data as T;
}

export async function apiGet<T>(path: string, params: Record<string, QueryValue> = {}): Promise<T> {
  const payload = await request<ApiSuccessResponse<T> | ApiPaginatedResponse<T>>(
    `${path}${buildQuery(params)}`,
  );
  return unwrap<T>(payload as ApiSuccessResponse<T>);
}

export async function apiGetPaginated<T>(
  path: string,
  params: Record<string, QueryValue> = {},
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const payload = await request<ApiPaginatedResponse<T>>(
    `${path}${buildQuery(params)}`,
  );
  return { data: payload.data, meta: payload.meta };
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const payload = await request<ApiSuccessResponse<T>>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return unwrap<T>(payload);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const payload = await request<ApiSuccessResponse<T>>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return unwrap<T>(payload);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const payload = await request<ApiSuccessResponse<T>>(path, { method: 'DELETE' });
  return unwrap<T>(payload);
}
