import { Attachment } from '@prisma/client';

export interface AttachmentResponse {
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
  createdAt: string;
  updatedAt: string;
}

export function toAttachmentResponse(
  attachment: Attachment,
): AttachmentResponse {
  return {
    id: attachment.id,
    filename: attachment.filename,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    storageKey: attachment.storageKey,
    storageUrl: attachment.storageUrl,
    meetingId: attachment.meetingId,
    noteId: attachment.noteId,
    taskId: attachment.taskId,
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
  };
}
