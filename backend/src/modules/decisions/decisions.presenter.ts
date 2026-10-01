type DecisionRow = {
  id: string;
  title: string;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; email: string };
};

export interface DecisionPresented {
  id: string;
  title: string;
  content: string | null;
  author: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export function toDecisionPresenter(decision: DecisionRow): DecisionPresented {
  return {
    id: decision.id,
    title: decision.title,
    content: decision.content,
    author: decision.author,
    createdAt: decision.createdAt.toISOString(),
    updatedAt: decision.updatedAt.toISOString(),
  };
}
