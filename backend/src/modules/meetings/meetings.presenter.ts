import { MeetingStatus, TeamRole } from '../../shared';

type MeetingRow = {
  id: string;
  title: string;
  description: string | null;
  status: MeetingStatus;
  startTime: Date;
  endTime: Date;
  timezone: string;
  location: string | null;
  meetingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  team: { id: string; name: string };
  organizer: { id: string; name: string; email: string };
};

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

export function toMeetingPresenter(
  meeting: MeetingRow,
  role: TeamRole | undefined,
): MeetingPresented {
  return {
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    status: meeting.status,
    startTime: meeting.startTime.toISOString(),
    endTime: meeting.endTime.toISOString(),
    timezone: meeting.timezone,
    location: meeting.location,
    meetingUrl: meeting.meetingUrl,
    role: role ?? null,
    team: meeting.team,
    organizer: meeting.organizer,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}
