type NoteRow = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; email: string };
};

export interface NotePresented {
  id: string;
  content: string;
  author: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export function toNotePresenter(note: NoteRow): NotePresented {
  return {
    id: note.id,
    content: note.content,
    author: note.author,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
