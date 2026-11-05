import { NotificationType } from '../../shared';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: unknown;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationRecord {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: unknown;
}

export interface MeetingReminderRecord {
  id: string;
  title: string;
  startTime: Date;
  participants: Array<{ userId: string }>;
}

export interface TaskDueRecord {
  id: string;
  title: string;
  assigneeId: string | null;
  dueDate: Date | null;
}

export type TaskDueDateFilter =
  { dueDate: { lte: Date } } | { dueDate: { gte: Date; lte: Date } };

export interface NotificationsRepository {
  list(
    userId: string,
    read: boolean | undefined,
    limit: number,
  ): Promise<NotificationRecord[]>;
  existsForUser(id: string, userId: string): Promise<boolean>;
  markAsRead(id: string): Promise<NotificationRecord>;
  markAllAsRead(userId: string): Promise<{ count: number }>;
  createMany(data: CreateNotificationRecord[]): Promise<NotificationRecord[]>;
  findMeetingsForReminder(
    from: Date,
    to: Date,
    limit: number,
  ): Promise<MeetingReminderRecord[]>;
  findTasksDue(
    filter: TaskDueDateFilter,
    limit: number,
  ): Promise<TaskDueRecord[]>;
  hasNotificationInWindow(
    userId: string,
    type: NotificationType,
    metadataKey: 'meetingId' | 'taskId',
    entityId: string,
    since: Date,
  ): Promise<boolean>;
}
