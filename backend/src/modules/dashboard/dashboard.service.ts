import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivityEntry,
  ActivityType,
  DashboardPresented,
} from './dashboard.presenter';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 7;
const FEED_LIMIT = 15;

const meetingSelect = {
  id: true,
  title: true,
  startTime: true,
  endTime: true,
  status: true,
  team: { select: { id: true, name: true } },
} as const;

const RECENT_PAST_DAYS = 30;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string): Promise<DashboardPresented> {
    const teamIds = await this.teamIdsOf(userId);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(startOfToday.getTime() + DAY_MS);
    const upcomingLimit = new Date(
      startOfToday.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS,
    );
    const recentLimit = new Date(now.getTime() - RECENT_PAST_DAYS * DAY_MS);
    const openTasks: TaskStatus[] = [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.BLOCKED,
    ];

    const [
      todayMeetings,
      upcomingMeetings,
      recentMeetings,
      pendingTasks,
      recentDecisions,
      activityMeetings,
      activityDecisions,
      activityNotes,
      activityTasks,
    ] = await Promise.all([
      this.prisma.meeting.findMany({
        where: {
          teamId: { in: teamIds },
          startTime: { gte: startOfToday, lt: endOfToday },
        },
        select: meetingSelect,
        orderBy: { startTime: 'asc' },
        take: FEED_LIMIT,
      }),
      this.prisma.meeting.findMany({
        where: {
          teamId: { in: teamIds },
          startTime: { gte: endOfToday, lt: upcomingLimit },
        },
        select: meetingSelect,
        orderBy: { startTime: 'asc' },
        take: FEED_LIMIT,
      }),
      this.prisma.meeting.findMany({
        where: {
          teamId: { in: teamIds },
          startTime: { gte: recentLimit, lt: startOfToday },
        },
        select: meetingSelect,
        orderBy: { startTime: 'desc' },
        take: FEED_LIMIT,
      }),
      this.prisma.task.findMany({
        where: { assigneeId: userId, status: { in: openTasks } },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          status: true,
        },
        orderBy: [
          { dueDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.decision.findMany({
        where: { meeting: { teamId: { in: teamIds } } },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          meetingId: true,
          author: { select: { id: true, name: true } },
          meeting: { select: { team: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: FEED_LIMIT,
      }),
      this.prisma.meeting.findMany({
        where: { teamId: { in: teamIds } },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          organizer: { select: { id: true, name: true } },
          team: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: FEED_LIMIT,
      }),
      this.prisma.decision.findMany({
        where: { meeting: { teamId: { in: teamIds } } },
        select: {
          id: true,
          title: true,
          createdAt: true,
          meetingId: true,
          author: { select: { id: true, name: true } },
          meeting: { select: { team: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: FEED_LIMIT,
      }),
      this.prisma.meetingNote.findMany({
        where: { meeting: { teamId: { in: teamIds } } },
        select: {
          id: true,
          content: true,
          createdAt: true,
          meetingId: true,
          author: { select: { id: true, name: true } },
          meeting: { select: { team: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: FEED_LIMIT,
      }),
      this.prisma.task.findMany({
        where: { teamId: { in: teamIds } },
        select: {
          id: true,
          title: true,
          createdAt: true,
          creator: { select: { id: true, name: true } },
          team: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: FEED_LIMIT,
      }),
    ]);

    const isOverdue = (dueDate: Date | null): boolean =>
      dueDate !== null && dueDate < now;

    const presentedTasks = pendingTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority as string,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      isOverdue: isOverdue(task.dueDate),
    }));

    return {
      metrics: {
        todayMeetings: todayMeetings.length,
        upcomingMeetings: upcomingMeetings.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: pendingTasks.filter((task) => isOverdue(task.dueDate))
          .length,
      },
      todayMeetings: todayMeetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status: meeting.status as string,
        team: meeting.team,
      })),
      upcomingMeetings: upcomingMeetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime.toISOString(),
        status: meeting.status as string,
        team: meeting.team,
      })),
      recentMeetings: recentMeetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime.toISOString(),
        status: meeting.status as string,
        team: meeting.team,
      })),
      pendingTasks: presentedTasks,
      overdueTasks: presentedTasks
        .filter((task) => task.isOverdue)
        .map(({ id, title, priority, dueDate }) => ({
          id,
          title,
          priority,
          dueDate,
        })),
      recentDecisions: recentDecisions.map((decision) => ({
        id: decision.id,
        title: decision.title,
        content: decision.content,
        createdAt: decision.createdAt.toISOString(),
        author: decision.author,
        meetingId: decision.meetingId,
        teamName: decision.meeting?.team.name ?? null,
      })),
      recentActivity: this.mergeActivity({
        meetings: activityMeetings,
        decisions: activityDecisions,
        notes: activityNotes,
        tasks: activityTasks,
      }),
    };
  }

  private async teamIdsOf(userId: string): Promise<string[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    return memberships.map((membership) => membership.teamId);
  }

  private mergeActivity(sources: {
    meetings: Array<{
      id: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      organizer: { id: string; name: string };
      team: { name: string };
    }>;
    decisions: Array<{
      id: string;
      title: string;
      createdAt: Date;
      meetingId: string | null;
      author: { id: string; name: string };
      meeting: { team: { name: string } } | null;
    }>;
    notes: Array<{
      id: string;
      content: string;
      createdAt: Date;
      meetingId: string | null;
      author: { id: string; name: string };
      meeting: { team: { name: string } } | null;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      createdAt: Date;
      creator: { id: string; name: string };
      team: { name: string };
    }>;
  }): ActivityEntry[] {
    const entries: ActivityEntry[] = [];

    for (const meeting of sources.meetings) {
      entries.push({
        type: 'MEETING_CREATED',
        title: `${meeting.organizer.name} creó la reunión "${meeting.title}"`,
        occurredAt: meeting.createdAt.toISOString(),
        teamName: meeting.team.name,
        meetingId: meeting.id,
        actor: meeting.organizer,
      });

      if (meeting.updatedAt.getTime() - meeting.createdAt.getTime() > 1000) {
        entries.push({
          type: 'MEETING_UPDATED',
          title: `${meeting.organizer.name} actualizó "${meeting.title}"`,
          occurredAt: meeting.updatedAt.toISOString(),
          teamName: meeting.team.name,
          meetingId: meeting.id,
          actor: meeting.organizer,
        });
      }
    }

    for (const decision of sources.decisions) {
      entries.push({
        type: 'DECISION_CREATED',
        title: `${decision.author.name} registró la decisión "${decision.title}"`,
        occurredAt: decision.createdAt.toISOString(),
        teamName: decision.meeting?.team.name ?? null,
        meetingId: decision.meetingId,
        actor: decision.author,
      });
    }

    for (const note of sources.notes) {
      entries.push({
        type: 'NOTE_CREATED',
        title: `${note.author.name} agregó una nota`,
        occurredAt: note.createdAt.toISOString(),
        teamName: note.meeting?.team.name ?? null,
        meetingId: note.meetingId,
        actor: note.author,
      });
    }

    for (const task of sources.tasks) {
      entries.push({
        type: 'TASK_CREATED',
        title: `${task.creator.name} creó la tarea "${task.title}"`,
        occurredAt: task.createdAt.toISOString(),
        teamName: task.team.name,
        meetingId: null,
        actor: task.creator,
      });
    }

    return entries
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, FEED_LIMIT);
  }
}

export { ActivityType };
