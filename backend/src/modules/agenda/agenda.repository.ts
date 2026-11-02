export interface AgendaItemRecord {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsibleId: string | null;
  responsible: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
}

export interface AgendaItemMutationRecord {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsibleId: string | null;
}

export interface CreateAgendaItemRecord {
  title: string;
  description?: string;
  durationMinutes?: number;
  responsibleId?: string;
}

export interface UpdateAgendaItemRecord {
  title: string;
  description: string | null;
  durationMinutes: number | null;
  responsibleId: string | null;
}

export interface AgendaRepository {
  listByMeeting(meetingId: string): Promise<AgendaItemRecord[]>;
  findMaxOrder(meetingId: string): Promise<number | null>;
  create(
    meetingId: string,
    data: CreateAgendaItemRecord,
    order: number,
  ): Promise<AgendaItemRecord>;
  findByMeeting(
    meetingId: string,
    itemId: string,
  ): Promise<AgendaItemMutationRecord | null>;
  update(
    itemId: string,
    data: UpdateAgendaItemRecord,
  ): Promise<AgendaItemRecord>;
  delete(itemId: string): Promise<void>;
  listIdsByMeeting(meetingId: string): Promise<Array<{ id: string }>>;
  reorder(itemIds: string[]): Promise<void>;
}
