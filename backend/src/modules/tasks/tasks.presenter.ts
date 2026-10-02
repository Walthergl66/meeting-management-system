import { TaskPriority, TaskStatus } from '../../shared';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string; email: string };
  team: { id: string; name: string };
  meeting: { id: string; title: string } | null;
  decision: { id: string; title: string } | null;
};

export interface TaskPresented {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string; email: string };
  team: { id: string; name: string };
  meeting: { id: string; title: string } | null;
  decision: { id: string; title: string } | null;
  isOverdue: boolean;
}

export function toTaskPresenter(task: TaskRow): TaskPresented {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    assignee: task.assignee,
    creator: task.creator,
    team: task.team,
    meeting: task.meeting,
    decision: task.decision,
    isOverdue:
      task.dueDate !== null &&
      task.dueDate.getTime() < Date.now() &&
      task.status !== TaskStatus.DONE &&
      task.status !== TaskStatus.CANCELLED,
  };
}
