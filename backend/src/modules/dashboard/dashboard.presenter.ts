export type ActivityType =
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'DECISION_CREATED'
  | 'NOTE_CREATED'
  | 'TASK_CREATED';

export interface ActivityEntry {
  type: ActivityType;
  title: string;
  occurredAt: string;
  teamName: string | null;
  meetingId: string | null;
  actor: { id: string; name: string };
}

export interface DashboardPresented {
  metrics: {
    todayMeetings: number;
    upcomingMeetings: number;
    pendingTasks: number;
    overdueTasks: number;
  };
  todayMeetings: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    team: { id: string; name: string };
  }>;
  upcomingMeetings: Array<{
    id: string;
    title: string;
    startTime: string;
    status: string;
    team: { id: string; name: string };
  }>;
  recentMeetings: Array<{
    id: string;
    title: string;
    startTime: string;
    status: string;
    team: { id: string; name: string };
  }>;
  pendingTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
    isOverdue: boolean;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
  }>;
  recentDecisions: Array<{
    id: string;
    title: string;
    content: string | null;
    createdAt: string;
    author: { id: string; name: string };
    meetingId: string | null;
    teamName: string | null;
  }>;
  recentActivity: ActivityEntry[];
}
