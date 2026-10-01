type AgendaItemRow = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsible: { id: string; name: string; email: string } | null;
};

export interface AgendaItemPresented {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsible: { id: string; name: string; email: string } | null;
}

export function toAgendaItemPresenter(
  item: AgendaItemRow,
): AgendaItemPresented {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    durationMinutes: item.durationMinutes,
    order: item.order,
    responsible: item.responsible,
  };
}
