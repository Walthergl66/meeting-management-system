import { describe, expect, it } from 'vitest';
import {
  MEETING_STATUS_LABELS,
  PARTICIPANT_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  TEAM_ROLE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/lib/utils/labels';
import {
  AttendanceStatus,
  MeetingStatus,
  ParticipantStatus,
  TaskPriority,
  TaskStatus,
  TeamRole,
} from '@/lib/shared';

describe('labels en español', () => {
  it.each(Object.values(MeetingStatus) as MeetingStatus[])(
    'mapea cada estado de reunión: %s',
    (status) => {
      expect(MEETING_STATUS_LABELS[status]).toBeTruthy();
      expect(MEETING_STATUS_LABELS[status]).not.toBe(status);
    },
  );

  it.each(Object.values(ParticipantStatus) as ParticipantStatus[])(
    'mapea cada estado de participante: %s',
    (status) => {
      expect(PARTICIPANT_STATUS_LABELS[status]).toBeTruthy();
      expect(PARTICIPANT_STATUS_LABELS[status]).not.toBe(status);
    },
  );

  it.each(Object.values(AttendanceStatus) as AttendanceStatus[])(
    'mapea cada estado de asistencia: %s',
    (status) => {
      expect(ATTENDANCE_STATUS_LABELS[status]).toBeTruthy();
      expect(ATTENDANCE_STATUS_LABELS[status]).not.toBe(status);
    },
  );

  it.each(Object.values(TeamRole) as TeamRole[])(
    'mapea cada rol de equipo: %s',
    (role) => {
      expect(TEAM_ROLE_LABELS[role]).toBeTruthy();
      expect(TEAM_ROLE_LABELS[role]).not.toBe(role);
    },
  );

  it.each(Object.values(TaskStatus) as TaskStatus[])(
    'mapea cada estado de tarea: %s',
    (status) => {
      expect(TASK_STATUS_LABELS[status]).toBeTruthy();
      expect(TASK_STATUS_LABELS[status]).not.toBe(status);
    },
  );

  it.each(Object.values(TaskPriority) as TaskPriority[])(
    'mapea cada prioridad de tarea: %s',
    (priority) => {
      expect(TASK_PRIORITY_LABELS[priority]).toBeTruthy();
      expect(TASK_PRIORITY_LABELS[priority]).not.toBe(priority);
    },
  );
});