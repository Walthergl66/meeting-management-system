import { composeName } from '../../common/utils/user-name';

type NoteRow = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; firstName: string; lastName: string; email: string };
};

type AuthorPresented = { id: string; name: string; email: string };

export interface NotePresented {
  id: string;
  content: string;
  author: AuthorPresented;
  createdAt: string;
  updatedAt: string;
}

export function toNotePresenter(note: NoteRow): NotePresented {
  return {
    id: note.id,
    content: note.content,
    author: {
      id: note.author.id,
      name: composeName(note.author),
      email: note.author.email,
    },
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
