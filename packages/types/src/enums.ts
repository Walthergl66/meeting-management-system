export const TeamRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  GUEST: 'GUEST',
} as const;
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];
export const TEAM_ROLES = Object.values(TeamRole) as TeamRole[];

export const MeetingStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus];
export const MEETING_STATUSES = Object.values(MeetingStatus) as MeetingStatus[];

export const ParticipantStatus = {
  INVITED: 'INVITED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  TENTATIVE: 'TENTATIVE',
} as const;
export type ParticipantStatus =
  (typeof ParticipantStatus)[keyof typeof ParticipantStatus];
export const PARTICIPANT_STATUSES = Object.values(
  ParticipantStatus,
) as ParticipantStatus[];

export const AttendanceStatus = {
  ATTENDED: 'ATTENDED',
  ABSENT: 'ABSENT',
} as const;
export type AttendanceStatus =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];
export const ATTENDANCE_STATUSES = Object.values(
  AttendanceStatus,
) as AttendanceStatus[];

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
export const TASK_STATUSES = Object.values(TaskStatus) as TaskStatus[];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];
export const TASK_PRIORITIES = Object.values(TaskPriority) as TaskPriority[];

export const NotificationType = {
  MEETING_INVITATION: 'MEETING_INVITATION',
  MEETING_UPDATED: 'MEETING_UPDATED',
  MEETING_CANCELLED: 'MEETING_CANCELLED',
  MEETING_REMINDER: 'MEETING_REMINDER',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  TASK_OVERDUE: 'TASK_OVERDUE',
  MENTION: 'MENTION',
  DECISION_CREATED: 'DECISION_CREATED',
} as const;
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];
export const NOTIFICATION_TYPES = Object.values(
  NotificationType,
) as NotificationType[];

export const AuditAction = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_REGISTERED: 'USER_REGISTERED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  MEETING_CREATED: 'MEETING_CREATED',
  MEETING_UPDATED: 'MEETING_UPDATED',
  MEETING_CANCELLED: 'MEETING_CANCELLED',
  MEMBER_INVITED: 'MEMBER_INVITED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  DECISION_CREATED: 'DECISION_CREATED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
export const AUDIT_ACTIONS = Object.values(AuditAction) as AuditAction[];

export const CalendarView = {
  MONTH: 'MONTH',
  WEEK: 'WEEK',
  DAY: 'DAY',
} as const;
export type CalendarView = (typeof CalendarView)[keyof typeof CalendarView];
export const CALENDAR_VIEWS = Object.values(CalendarView) as CalendarView[];

export const SearchEntityType = {
  MEETINGS: 'meetings',
  TASKS: 'tasks',
  DECISIONS: 'decisions',
  NOTES: 'notes',
  USERS: 'users',
} as const;
export type SearchEntityType =
  (typeof SearchEntityType)[keyof typeof SearchEntityType];
export const SEARCH_ENTITY_TYPES = Object.values(
  SearchEntityType,
) as SearchEntityType[];

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
