import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { MeetingStatus, NotificationType, TaskStatus } from '../../shared';
import { NOTIFICATION_SCHEDULER } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Clave del metadata con la que se identifica la entidad que origina el aviso. */
type NotificationMetadataKey = 'meetingId' | 'taskId';

/**
 * Barridos programados para las notificaciones que dependen del tiempo
 * (MEETING_REMINDER, TASK_DUE_SOON, TASK_OVERDUE). Los eventos de dominio
 * siguen siendo el mecanismo para el resto de notificaciones.
 *
 * Cada barrido es idempotente por destinatario y ventana: si ya existe una
 * notificación del mismo tipo para la misma entidad dentro de la ventana, no
 * se duplica.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Interval('notification-sweep', NOTIFICATION_SCHEDULER.SWEEP_INTERVAL_MS)
  async scheduledSweep(): Promise<void> {
    try {
      await this.sweep();
    } catch (error) {
      this.logger.error(
        `Fallo en el barrido de notificaciones: ${(error as Error).message}`,
      );
    }
  }

  async sweep(): Promise<void> {
    await Promise.all([
      this.sweepMeetingReminders(),
      this.sweepTaskDueSoon(),
      this.sweepTaskOverdue(),
    ]);
  }

  private async sweepMeetingReminders(): Promise<void> {
    const now = new Date();
    const from = new Date(
      now.getTime() +
        NOTIFICATION_SCHEDULER.MEETING_REMINDER_MINUTES * MINUTE_MS,
    );
    const to = new Date(
      now.getTime() +
        (NOTIFICATION_SCHEDULER.MEETING_REMINDER_MINUTES + 5) * MINUTE_MS,
    );

    const meetings = await this.prisma.meeting.findMany({
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
      take: NOTIFICATION_SCHEDULER.MAX_PER_SWEEP,
    });

    for (const meeting of meetings) {
      const recipients = [
        ...new Set(meeting.participants.map((p) => p.userId)),
      ];

      for (const userId of recipients) {
        const already = await this.alreadyNotifiedInWindow(
          userId,
          NotificationType.MEETING_REMINDER,
          'meetingId',
          meeting.id,
          now,
        );
        if (already) continue;

        await this.notifications.createFor([userId], {
          type: NotificationType.MEETING_REMINDER,
          title: 'La reunión empieza pronto',
          body: `"${meeting.title}" comienza en menos de ${NOTIFICATION_SCHEDULER.MEETING_REMINDER_MINUTES} minutos.`,
          metadata: { meetingId: meeting.id },
        });
      }
    }
  }

  private async sweepTaskDueSoon(): Promise<void> {
    const now = new Date();
    const from = new Date(now.getTime());
    const to = new Date(
      now.getTime() + NOTIFICATION_SCHEDULER.TASK_DUE_SOON_HOURS * HOUR_MS,
    );

    await this.notifyTasks(
      { dueDate: { gte: from, lte: to } },
      NotificationType.TASK_DUE_SOON,
      (task) => ({
        title: 'Tarea por vencer',
        body: `"${task.title}" vence hoy.`,
      }),
      now,
    );
  }

  private async sweepTaskOverdue(): Promise<void> {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * HOUR_MS);

    await this.notifyTasks(
      { dueDate: { lte: from } },
      NotificationType.TASK_OVERDUE,
      (task) => ({
        title: 'Tarea vencida',
        body: `"${task.title}" está vencida.`,
      }),
      now,
    );
  }

  private async notifyTasks(
    dueDateFilter: { dueDate: { lte: Date } | { gte: Date; lte: Date } },
    type: NotificationType,
    build: (task: { title: string }) => { title: string; body: string },
    now: Date,
  ): Promise<void> {
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: { not: null },
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
        },
        ...dueDateFilter,
      },
      select: { id: true, title: true, assigneeId: true, dueDate: true },
      take: NOTIFICATION_SCHEDULER.MAX_PER_SWEEP,
    });

    for (const task of tasks) {
      if (!task.assigneeId) continue;

      const already = await this.alreadyNotifiedInWindow(
        task.assigneeId,
        type,
        'taskId',
        task.id,
        now,
      );
      if (already) continue;

      await this.notifications.createFor([task.assigneeId], {
        type,
        title: build(task).title,
        body: build(task).body,
        metadata: {
          taskId: task.id,
          dueDate: task.dueDate?.toISOString() ?? undefined,
        },
      });
    }
  }

  private async alreadyNotifiedInWindow(
    userId: string,
    type: NotificationType,
    metadataKey: NotificationMetadataKey,
    entityId: string,
    now: Date,
  ): Promise<boolean> {
    const since = new Date(
      now.getTime() - NOTIFICATION_SCHEDULER.SWEEP_INTERVAL_MS * 4,
    );

    // La entidad se filtra dentro de la consulta. Antes se traía la
    // notificación más reciente con findFirst y se comparaba su metadata en
    // memoria: si el destinatario tenía varias del mismo tipo, la fila traída
    // podía ser de otra entidad y el barrido volvía a notificar, duplicando.
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
