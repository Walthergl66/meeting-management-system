import { AuditAction, AuditEntityType, AuditLogFilter } from '../../shared';
import { Prisma } from '@prisma/client';

export interface CreateAuditRecord {
  userId: string;
  action: AuditAction;
  entity: AuditEntityType;
  entityId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface AuditRepository {
  create(data: CreateAuditRecord): Promise<void>;
  listForUser(
    userId: string,
    filter: AuditLogFilter,
  ): Promise<{ rows: any[]; total: number }>;
}
