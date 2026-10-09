import { TaskPriority, TaskStatus } from '../../shared';
import { composeName } from '../../common/utils/user-name';

type UserRef = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type UserRefPresented = { id: string; name: string; email: string };

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignee: UserRef | null;
  creator: UserRef;
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
  assignee: UserRefPresented | null;
  creator: UserRefPresented;
  team: { id: string; name: string };
  meeting: { id: string; title: string } | null;
  decision: { id: string; title: string } | null;
  isOverdue: boolean;
}

const toUserRef = (user: UserRef): UserRefPresented => ({
  id: user.id,
  name: composeName(user),
  email: user.email,
});

export function toTaskPresenter(task: TaskRow): TaskPresented {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    assignee: task.assignee ? toUserRef(task.assignee) : null,
    creator: toUserRef(task.creator),
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
