export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUTH = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 72,
  BCRYPT_ROUNDS: 10,
  JWT_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  RESET_TOKEN_EXPIRES_IN: '1h',
  LOGIN_RATE_LIMIT: { limit: 10, ttl: 60_000 },
  FORGOT_PASSWORD_RATE_LIMIT: { limit: 5, ttl: 3_600_000 },
  THROTTLE_TTL_MS: 60_000,
  THROTTLE_LIMIT: 100,
} as const;

export const MEETING = {
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 5000,
  DEFAULT_TIMEZONE: 'UTC',
} as const;

export const MEETING_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const TASK_STATUS_TRANSITIONS: Record<string, string[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'],
  IN_PROGRESS: ['BLOCKED', 'DONE', 'CANCELLED', 'TODO'],
  BLOCKED: ['TODO', 'IN_PROGRESS', 'CANCELLED'],
  DONE: ['TODO', 'IN_PROGRESS'],
  CANCELLED: ['TODO'],
};

export const PARTICIPANT_STATUS_TRANSITIONS: Record<string, string[]> = {
  INVITED: ['ACCEPTED', 'DECLINED', 'TENTATIVE'],
  ACCEPTED: ['TENTATIVE', 'DECLINED', 'ATTENDED', 'ABSENT'],
  TENTATIVE: ['ACCEPTED', 'DECLINED', 'ATTENDED', 'ABSENT'],
  DECLINED: ['ACCEPTED', 'TENTATIVE'],
  ATTENDED: [],
  ABSENT: ['ATTENDED'],
};

export const TASK_OVERDUE_GRACE_HOURS = 24;

export const NOTIFICATION_SCHEDULER = {
  /** Periodicidad del barrido de recordatorios (ms). */
  SWEEP_INTERVAL_MS: 5 * 60 * 1000,
  /** Ventana previa al inicio para MEETING_REMINDER. */
  MEETING_REMINDER_MINUTES: 60,
  /** Ventana previa a la fecha límite para TASK_DUE_SOON. */
  TASK_DUE_SOON_HOURS: 24,
  /** Tope de notificaciones creadas por barrido. */
  MAX_PER_SWEEP: 500,
} as const;

export const ATTACHMENT = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;
