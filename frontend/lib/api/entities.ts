import {
  AttendanceStatus,
  MeetingStatus,
  NotificationType,
  ParticipantStatus,
  TaskPriority,
  TaskStatus,
  TeamRole,
} from '@/lib/shared';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: UserProfile;
  tokens: {
    accessToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  };
}

export interface TeamPresented {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  role: TeamRole;
  memberCount: number;
  createdAt: string;
}

export interface MeetingPresented {
  id: string;
  title: string;
  description: string | null;
  status: MeetingStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string | null;
  meetingUrl: string | null;
  role: TeamRole | null;
  team: { id: string; name: string };
  organizer: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  teamId: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  location?: string;
  meetingUrl?: string;
}

export interface UpdateMeetingPayload {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  location?: string;
  meetingUrl?: string;
  status?: MeetingStatus;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<AuthSession>('/auth/login', { email, password }),
  register: (payload: {
    email: string;
    name: string;
    password: string;
    timezone?: string;
  }) => apiPost<AuthSession>('/auth/register', payload),
  me: () => apiGet<UserProfile>('/users/me'),
};

export const teamsApi = {
  list: () => apiGet<TeamPresented[]>('/teams'),
  create: (payload: { name: string; description?: string }) =>
    apiPost<TeamPresented>('/teams', payload),
};

export const meetingsApi = {
  list: (teamId?: string) =>
    apiGet<MeetingPresented[]>(`/meetings`, teamId ? { teamId } : {}),
  get: (id: string) => apiGet<MeetingPresented>(`/meetings/${id}`),
  create: (payload: CreateMeetingPayload) =>
    apiPost<MeetingPresented>('/meetings', payload),
  update: (id: string, payload: UpdateMeetingPayload) =>
    apiPatch<MeetingPresented>(`/meetings/${id}`, payload),
  remove: (id: string) => apiDelete<{ message: string }>(`/meetings/${id}`),
};

export interface ParticipantPresented {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  attendance: AttendanceStatus | null;
  joinedAt: string;
}

export interface AgendaItemPresented {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsible: { id: string; name: string; email: string } | null;
}

export const participantsApi = {
  list: (meetingId: string) =>
    apiGet<ParticipantPresented[]>(`/meetings/${meetingId}/participants`),
  invite: (meetingId: string, userIds: string[]) =>
    apiPost<ParticipantPresented[]>(`/meetings/${meetingId}/participants`, {
      userIds,
    }),
  respond: (meetingId: string, status: ParticipantStatus) =>
    apiPatch<ParticipantPresented>(
      `/meetings/${meetingId}/participants/me`,
      { status },
    ),
  recordAttendance: (
    meetingId: string,
    userId: string,
    attendance: AttendanceStatus,
  ) =>
    apiPatch<ParticipantPresented>(
      `/meetings/${meetingId}/participants/${userId}/attendance`,
      { attendance },
    ),
  remove: (meetingId: string, userId: string) =>
    apiDelete<{ message: string }>(
      `/meetings/${meetingId}/participants/${userId}`,
    ),
};

export const agendaApi = {
  list: (meetingId: string) =>
    apiGet<AgendaItemPresented[]>(`/meetings/${meetingId}/agenda`),
  create: (
    meetingId: string,
    payload: {
      title: string;
      description?: string;
      durationMinutes?: number;
      responsibleId?: string;
    },
  ) => apiPost<AgendaItemPresented>(`/meetings/${meetingId}/agenda`, payload),
  update: (
    itemId: string,
    payload: {
      title?: string;
      description?: string;
      durationMinutes?: number;
      responsibleId?: string;
    },
  ) => apiPatch<AgendaItemPresented>(`/agenda/${itemId}`, payload),
  remove: (itemId: string) =>
    apiDelete<{ message: string }>(`/agenda/${itemId}`),
  reorder: (meetingId: string, order: string[]) =>
    apiPatch<AgendaItemPresented[]>(
      `/meetings/${meetingId}/agenda/reorder`,
      { order },
    ),
};

export interface NotePresented {
  id: string;
  content: string;
  author: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface DecisionPresented {
  id: string;
  title: string;
  content: string | null;
  author: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const notesApi = {
  list: (meetingId: string) =>
    apiGet<NotePresented[]>(`/meetings/${meetingId}/notes`),
  create: (meetingId: string, content: string) =>
    apiPost<NotePresented>(`/meetings/${meetingId}/notes`, { content }),
  update: (noteId: string, content: string) =>
    apiPatch<NotePresented>(`/notes/${noteId}`, { content }),
  remove: (noteId: string) => apiDelete<{ message: string }>(`/notes/${noteId}`),
};

export const decisionsApi = {
  list: (meetingId: string) =>
    apiGet<DecisionPresented[]>(`/meetings/${meetingId}/decisions`),
  create: (meetingId: string, payload: { title: string; content?: string }) =>
    apiPost<DecisionPresented>(`/meetings/${meetingId}/decisions`, payload),
  update: (
    decisionId: string,
    payload: { title?: string; content?: string },
  ) => apiPatch<DecisionPresented>(`/decisions/${decisionId}`, payload),
  remove: (decisionId: string) =>
    apiDelete<{ message: string }>(`/decisions/${decisionId}`),
};

export interface TaskPresented {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string; email: string };
  team: { id: string; name: string };
  meeting: { id: string; title: string } | null;
  isOverdue: boolean;
}

export const tasksApi = {
  list: (filters?: {
    teamId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    meetingId?: string;
  }) => {
    const params: Record<string, string> = {};
    if (filters?.teamId) params.teamId = filters.teamId;
    if (filters?.status) params.status = filters.status;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.assigneeId) params.assigneeId = filters.assigneeId;
    if (filters?.meetingId) params.meetingId = filters.meetingId;
    const query = new URLSearchParams(params).toString();
    return apiGet<TaskPresented[]>(`/tasks${query ? `?${query}` : ''}`);
  },
  get: (taskId: string) => apiGet<TaskPresented>(`/tasks/${taskId}`),
  create: (payload: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    assigneeId?: string;
    teamId: string;
    meetingId?: string;
    decisionId?: string;
  }) => apiPost<TaskPresented>('/tasks', payload),
  update: (
    taskId: string,
    payload: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
      assigneeId?: string;
    },
  ) => apiPatch<TaskPresented>(`/tasks/${taskId}`, payload),
  remove: (taskId: string) =>
    apiDelete<{ message: string }>(`/tasks/${taskId}`),
};

export interface NotificationPresented {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (filters?: { read?: boolean }) => {
    const params: Record<string, string> = {};
    if (filters?.read !== undefined) params.read = String(filters.read);
    const query = new URLSearchParams(params).toString();
    return apiGet<NotificationPresented[]>(`/notifications${query ? `?${query}` : ''}`);
  },
  markAsRead: (id: string) =>
    apiPatch<NotificationPresented>(`/notifications/${id}/read`),
  markAllAsRead: () => apiPatch<{ message: string }>('/notifications/read-all'),
};

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

export interface DashboardSummary {
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

export const dashboardApi = {
  summary: () => apiGet<DashboardSummary>('/dashboard'),
};