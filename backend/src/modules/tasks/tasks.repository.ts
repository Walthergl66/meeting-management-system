import { TaskPriority, TaskStatus } from '../../shared';

export interface TaskListFilters {
  teamId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  meetingId?: string;
  from?: Date;
  to?: Date;
}

export interface TaskMutationRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeId: string | null;
  creatorId: string;
  teamId: string;
  meetingId: string | null;
}

export interface TaskRecord extends TaskMutationRecord {
  decisionId: string | null;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  team: { id: string; name: string };
  meeting: { id: string; title: string } | null;
  decision: { id: string; title: string } | null;
}

export interface CreateTaskRecord {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeId?: string;
  creatorId: string;
  teamId: string;
  meetingId?: string;
  decisionId?: string;
}

export interface UpdateTaskRecord {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeId: string | null;
}

export interface TasksRepository {
  listForUser(
    userId: string,
    filters: TaskListFilters,
    limit: number,
  ): Promise<TaskRecord[]>;
  findByIdForUser(userId: string, taskId: string): Promise<TaskRecord | null>;
  findForMutation(
    userId: string,
    taskId: string,
  ): Promise<TaskMutationRecord | null>;
  create(data: CreateTaskRecord): Promise<TaskRecord>;
  update(taskId: string, data: UpdateTaskRecord): Promise<TaskRecord>;
  delete(taskId: string): Promise<void>;
}
