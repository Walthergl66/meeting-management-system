import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MeetingStatus, NotificationType, TaskStatus } from '../../../shared';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateNotificationRecord,
  MeetingReminderRecord,
  NotificationRecord,
  NotificationsRepository,
  TaskDueDateFilter,
  TaskDueRecord,
} from '../notifications.repository';

@Injectable()
export class PrismaNotificationsRepository implements NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    userId: string,
    read: boolean | undefined,
    limit: number,
  ): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: { userId, ...(read !== undefined ? { read } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async existsForUser(id: string, userId: string): Promise<boolean> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    return notification !== null;
  }

  markAsRead(id: string): Promise<NotificationRecord> {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  createMany(data: CreateNotificationRecord[]): Promise<NotificationRecord[]> {
    return this.prisma.notification.createManyAndReturn({
      data: data.map((row) => ({
        ...row,
        ...(row.metadata
          ? { metadata: row.metadata as Prisma.InputJsonValue }
          : {}),
      })) as Prisma.NotificationCreateManyInput[],
    });
  }

  findMeetingsForReminder(
    from: Date,
    to: Date,
    limit: number,
  ): Promise<MeetingReminderRecord[]> {
    return this.prisma.meeting.findMany({
      where: {
        status: MeetingStatus.SCHEDULED,
        startTime: { gte: from, lt: to },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        participants: { select: { userId: true } },
      },
      take: limit,
    });
  }

  findTasksDue(
    filter: TaskDueDateFilter,
    limit: number,
  ): Promise<TaskDueRecord[]> {
    return this.prisma.task.findMany({
      where: {
        assigneeId: { not: null },
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
        },
        ...filter,
      },
      select: { id: true, title: true, assigneeId: true, dueDate: true },
      take: limit,
    });
  }

  async hasNotificationInWindow(
    userId: string,
    type: NotificationType,
    metadataKey: 'meetingId' | 'taskId',
    entityId: string,
    since: Date,
  ): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
        FROM notifications
       WHERE "user_id" = ${userId}
         AND type = ${type}::"NotificationType"
         AND metadata->>${metadataKey} = ${entityId}
         AND "created_at" >= ${since}
       LIMIT 1
    `);
    return rows.length > 0;
  }
}
