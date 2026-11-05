import { MeetingStatus } from '../../shared';

export interface MeetingRecord {
  id: string;
  title: string;
  description: string | null;
  teamId: string;
  organizerId: string;
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
}

export interface CreateMeetingRecord {
  title: string;
  description?: string | null;
  teamId: string;
  organizerId: string;
  status: MeetingStatus;
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: string | null;
  meetingUrl?: string | null;
}

export interface UpdateMeetingRecord {
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  status: MeetingStatus;
  location: string | null;
  meetingUrl: string | null;
}

export interface MeetingConflictQuery {
  organizerId: string;
  startTime: Date;
  endTime: Date;
  statuses: MeetingStatus[];
  excludeId?: string;
}

export interface MeetingsRepository {
  findAccessByResourceId(id: string): Promise<MeetingAccessRecord | null>;
  findAccessByAgendaItemId(id: string): Promise<MeetingAccessRecord | null>;
  create(data: CreateMeetingRecord): Promise<MeetingRecord>;
  listForUser(
    userId: string,
    teamId: string | undefined,
    limit: number,
  ): Promise<MeetingRecord[]>;
  findById(id: string): Promise<MeetingRecord | null>;
  update(id: string, data: UpdateMeetingRecord): Promise<MeetingRecord>;
  delete(id: string): Promise<void>;
  findOrganizerConflict(
    query: MeetingConflictQuery,
  ): Promise<{ id: string; title: string } | null>;
}

export interface MeetingAccessRecord {
  id: string;
  teamId: string;
  organizerId: string;
  status: string;
}
