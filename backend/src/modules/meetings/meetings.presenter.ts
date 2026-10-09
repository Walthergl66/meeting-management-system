import { MeetingStatus, TeamRole } from '../../shared';
import { composeName } from '../../common/utils/user-name';

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
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
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
    organizer: {
      id: meeting.organizer.id,
      name: composeName(meeting.organizer),
      email: meeting.organizer.email,
    },
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}
