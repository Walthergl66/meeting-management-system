import type { AuditAction, AuditEntityType } from './enums';

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  message?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: ApiErrorDetail[];
  path?: string;
  timestamp?: string;
  requestId?: string;
}

export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface DateRangeQuery {
  from?: string;
  to?: string;
}

export interface TeamScopedQuery extends PageQuery {
  teamId?: string;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'ok' | 'error';
  uptime: number;
}

export interface AuditLogFilter {
  action?: AuditAction;
  entity?: AuditEntityType;
  entityId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
