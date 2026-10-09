import {
  AttendanceStatus,
  MeetingStatus,
  ParticipantStatus,
  TaskPriority,
  TaskStatus,
  TeamRole,
} from '@/lib/shared';

/** Etiquetas de UI en español para los enums compartidos. */
export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  INVITED: 'Invitado',
  ACCEPTED: 'Aceptado',
  DECLINED: 'Declinado',
  TENTATIVE: 'Tentativo',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  ATTENDED: 'Asistió',
  ABSENT: 'Ausente',
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
  GUEST: 'Invitado',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  BLOCKED: 'Bloqueada',
  DONE: 'Completada',
  CANCELLED: 'Cancelada',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};