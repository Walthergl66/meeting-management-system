import { AttendanceStatus, ParticipantStatus } from '@meetflow/types';

type ParticipantRow = {
  id: string;
  status: ParticipantStatus;
  attendance: AttendanceStatus | null;
  createdAt: Date;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
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

export function toParticipantPresenter(
  participant: ParticipantRow,
): ParticipantPresented {
  return {
    id: participant.id,
    userId: participant.user.id,
    name: participant.user.name,
    email: participant.user.email,
    avatarUrl: participant.user.avatarUrl,
    status: participant.status,
    attendance: participant.attendance,
    joinedAt: participant.createdAt.toISOString(),
  };
}
