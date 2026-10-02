import { MeetingStatus } from '../../shared';

/**
 * Transiciones de estado permitidas para una reunion.
 * Del plan: "Estado valido para la transicion solicitada".
 */
export const MEETING_TRANSITIONS: Record<MeetingStatus, MeetingStatus[]> = {
  [MeetingStatus.DRAFT]: [MeetingStatus.SCHEDULED, MeetingStatus.CANCELLED],
  [MeetingStatus.SCHEDULED]: [
    MeetingStatus.IN_PROGRESS,
    MeetingStatus.CANCELLED,
  ],
  [MeetingStatus.IN_PROGRESS]: [
    MeetingStatus.COMPLETED,
    MeetingStatus.CANCELLED,
  ],
  [MeetingStatus.COMPLETED]: [],
  [MeetingStatus.CANCELLED]: [],
};

export function isAllowedTransition(
  current: MeetingStatus,
  next: MeetingStatus,
): boolean {
  return MEETING_TRANSITIONS[current].includes(next);
}

export const SCHEDULED_LIKE: MeetingStatus[] = [
  MeetingStatus.SCHEDULED,
  MeetingStatus.IN_PROGRESS,
];
