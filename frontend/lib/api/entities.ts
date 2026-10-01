import {
  AttendanceStatus,
  MeetingStatus,
  ParticipantStatus,
  TeamRole,
} from '@meetflow/types';
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