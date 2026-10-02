export class MeetingCreatedEvent {
  constructor(
    public readonly meetingId: string,
    public readonly teamId: string,
    public readonly organizerId: string,
    public readonly title: string,
  ) {}
}

export class MeetingUpdatedEvent {
  constructor(
    public readonly meetingId: string,
    public readonly teamId: string,
    public readonly organizerId: string,
    public readonly title: string,
  ) {}
}

export class MeetingCancelledEvent {
  constructor(
    public readonly meetingId: string,
    public readonly teamId: string,
    public readonly organizerId: string,
    public readonly title: string,
  ) {}
}

export class TaskAssignedEvent {
  constructor(
    public readonly taskId: string,
    public readonly teamId: string,
    public readonly assigneeId: string,
    public readonly creatorId: string,
    public readonly title: string,
  ) {}
}

export class DecisionCreatedEvent {
  constructor(
    public readonly decisionId: string,
    public readonly meetingId: string,
    public readonly teamId: string,
    public readonly authorId: string,
    public readonly title: string,
  ) {}
}

export class NotificationCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly title: string,
    public readonly body: string | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: string,
  ) {}
}

export class TaskChangedEvent {
  constructor(
    public readonly taskId: string,
    public readonly teamId: string,
    public readonly meetingId: string | null,
  ) {}
}

export class MeetingParticipantsChangedEvent {
  constructor(
    public readonly meetingId: string,
    public readonly teamId: string,
  ) {}
}

export class AgendaChangedEvent {
  constructor(
    public readonly meetingId: string,
    public readonly teamId: string,
    /**
     * La agenda solo se difunde al equipo cuando la reunion esta en curso, para
     * no generar trafico innecesario en la vista de detalle.
     */
    public readonly broadcastToTeam: boolean,
  ) {}
}
