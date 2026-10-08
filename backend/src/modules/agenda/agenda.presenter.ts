import { composeName } from '../../common/utils/user-name';

type AgendaItemRow = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsible: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type ResponsiblePresented = { id: string; name: string; email: string };

export interface AgendaItemPresented {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsible: ResponsiblePresented | null;
}

const toResponsible = (
  responsible: AgendaItemRow['responsible'],
): ResponsiblePresented | null =>
  responsible
    ? {
        id: responsible.id,
        name: composeName(responsible),
        email: responsible.email,
      }
    : null;

export function toAgendaItemPresenter(
  item: AgendaItemRow,
): AgendaItemPresented {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    durationMinutes: item.durationMinutes,
    order: item.order,
    responsible: toResponsible(item.responsible),
  };
}
