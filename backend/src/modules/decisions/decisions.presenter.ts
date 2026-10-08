import { composeName } from '../../common/utils/user-name';

type DecisionRow = {
  id: string;
  title: string;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; firstName: string; lastName: string; email: string };
};

type AuthorPresented = { id: string; name: string; email: string };

export interface DecisionPresented {
  id: string;
  title: string;
  content: string | null;
  author: AuthorPresented;
  createdAt: string;
  updatedAt: string;
}

export function toDecisionPresenter(decision: DecisionRow): DecisionPresented {
  return {
    id: decision.id,
    title: decision.title,
    content: decision.content,
    author: {
      id: decision.author.id,
      name: composeName(decision.author),
      email: decision.author.email,
    },
    createdAt: decision.createdAt.toISOString(),
    updatedAt: decision.updatedAt.toISOString(),
  };
}
