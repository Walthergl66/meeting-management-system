import { MeetingStatus, TaskPriority, TaskStatus } from '../../shared';

export type SearchType = 'meetings' | 'tasks' | 'decisions' | 'notes' | 'users';

export type SearchQuery = {
  q: string;
  type?: SearchType;
  teamId?: string;
  userId?: string;
  status?: MeetingStatus | TaskStatus;
  priority?: TaskPriority;
  from?: Date;
  to?: Date;
  limit: number;
};

export type SearchHit = Record<string, unknown> & { id: string; rank: number };

export type SearchResult = {
  total: number;
  groups: Partial<Record<SearchType, SearchHit[]>>;
};
