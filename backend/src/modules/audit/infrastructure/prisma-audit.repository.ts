import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogFilter } from '../../../shared';
import { AuditRepository, CreateAuditRecord } from '../audit.repository';

@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditRecord): Promise<void> {
    await this.prisma.auditLog.create({ data });
  }

  async listForUser(userId: string, filter: AuditLogFilter) {
    const teamIds = (
      await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      })
    ).map(({ teamId }) => teamId);
    const teammates = (
      await this.prisma.teamMember.findMany({
        where: { teamId: { in: teamIds } },
        select: { userId: true },
      })
    ).map(({ userId: memberId }) => memberId);
    const where: Prisma.AuditLogWhereInput = {
      userId: { in: [...new Set([userId, ...teammates])] },
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entity ? { entity: filter.entity } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit,
        skip: filter.offset,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { rows, total };
  }
}
