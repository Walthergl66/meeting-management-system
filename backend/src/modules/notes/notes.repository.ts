export interface NoteRecord {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export interface NoteMutationRecord {
  id: string;
  content: string;
  authorId: string;
}

export interface NotesRepository {
  listByMeeting(meetingId: string, limit: number): Promise<NoteRecord[]>;
  isMeetingParticipant(meetingId: string, userId: string): Promise<boolean>;
  findByMeeting(
    meetingId: string,
    noteId: string,
  ): Promise<NoteMutationRecord | null>;
  create(
    meetingId: string,
    authorId: string,
    content: string,
  ): Promise<NoteRecord>;
  update(noteId: string, content: string): Promise<NoteRecord>;
  delete(noteId: string): Promise<void>;
}
