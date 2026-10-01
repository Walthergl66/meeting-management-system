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
