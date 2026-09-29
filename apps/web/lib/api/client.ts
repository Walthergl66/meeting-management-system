import type {
  ApiErrorDetail,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from '@meetflow/types';
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

export async function apiGet<T>(path: string, params: Record<string, QueryValue> = {}): Promise<T> {
  const payload = await request<ApiSuccessResponse<T> | ApiPaginatedResponse<T>>(
    `${path}${buildQuery(params)}`,
  );
  return (payload as ApiSuccessResponse<T>).data;
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
  return payload.data;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const payload = await request<ApiSuccessResponse<T>>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return payload.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const payload = await request<ApiSuccessResponse<T>>(path, { method: 'DELETE' });
  return payload.data;
}
