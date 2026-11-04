export interface AttachmentRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string | null;
  meetingId: string | null;
  noteId: string | null;
  taskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachmentWithScope extends AttachmentRecord {
  meeting: { teamId: string } | null;
  note: { meeting: { teamId: string } } | null;
  task: { teamId: string } | null;
}

export interface CreateAttachmentRecord {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string | null;
  meetingId?: string;
  noteId?: string;
  taskId?: string;
}

export interface AttachmentsRepository {
  findMeetingTeamId(meetingId: string): Promise<string | null>;
  findNoteTeamId(noteId: string): Promise<string | null>;
  findTaskTeamId(taskId: string): Promise<string | null>;
  create(data: CreateAttachmentRecord): Promise<AttachmentRecord>;
  findByIdWithScope(id: string): Promise<AttachmentWithScope | null>;
  delete(id: string): Promise<void>;
}
