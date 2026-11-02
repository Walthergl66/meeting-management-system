export interface DecisionRecord {
  id: string;
  title: string;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export interface DecisionMutationRecord {
  id: string;
  title: string;
  content: string | null;
  authorId: string;
}

export interface DecisionsRepository {
  listByMeeting(meetingId: string): Promise<DecisionRecord[]>;
  isMeetingParticipant(meetingId: string, userId: string): Promise<boolean>;
  findByMeeting(
    meetingId: string,
    decisionId: string,
  ): Promise<DecisionMutationRecord | null>;
  create(
    meetingId: string,
    authorId: string,
    title: string,
    content?: string,
  ): Promise<DecisionRecord>;
  update(
    decisionId: string,
    title: string,
    content: string | null,
  ): Promise<DecisionRecord>;
  delete(decisionId: string): Promise<void>;
}
