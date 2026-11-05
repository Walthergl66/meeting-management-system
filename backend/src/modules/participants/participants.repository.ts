import { AttendanceStatus, ParticipantStatus } from '../../shared';

export interface ParticipantRecord {
  id: string;
  userId: string;
  status: ParticipantStatus;
  attendance: AttendanceStatus | null;
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface ParticipantMutationRecord {
  id: string;
  userId: string;
}

export interface ParticipantsRepository {
  listByMeeting(meetingId: string): Promise<ParticipantRecord[]>;
  findUserIdsByMeeting(meetingId: string, userIds: string[]): Promise<string[]>;
  listUserIdsByMeeting(
    meetingId: string,
    excludeUserId?: string,
  ): Promise<string[]>;
  createMany(
    meetingId: string,
    userIds: string[],
  ): Promise<ParticipantRecord[]>;
  findByMeetingAndUserId(
    meetingId: string,
    userId: string,
  ): Promise<ParticipantMutationRecord | null>;
  updateStatus(
    participantId: string,
    status: ParticipantStatus,
  ): Promise<ParticipantRecord>;
  updateAttendance(
    participantId: string,
    attendance: AttendanceStatus,
  ): Promise<ParticipantRecord>;
  delete(participantId: string): Promise<void>;
}
