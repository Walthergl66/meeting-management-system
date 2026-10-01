'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@meetflow/types';
import { tasksApi, teamsApi, TaskPresented } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/utils/format';

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  teamId: z.string().min(1, 'Selecciona un equipo'),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().optional(),
});
type CreateTaskInput = z.infer<typeof createTaskSchema>;

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  BLOCKED: 'Bloqueada',
  DONE: 'Completada',
  CANCELLED: 'Cancelada',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export default function TasksPage() {
  const session = useRequireSession();
  const queryClient = useQueryClient();

  const tasks = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
    enabled: Boolean(session.data?.user),
  });

  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
    enabled: Boolean(session.data?.user),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
  });

  const create = useMutation({
    mutationFn: (values: CreateTaskInput) =>
      tasksApi.create({
        title: values.title,
        description: values.description || undefined,
        teamId: values.teamId,
        priority: values.priority,
        dueDate: values.dueDate || undefined,
      }),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => tasksApi.update(taskId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const remove = useMutation({
    mutationFn: (taskId: string) => tasksApi.remove(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  if (session.isPending || tasks.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Cargando…</p>
      </AppShell>
    );
  }

  if (tasks.isError) {
    return (
      <AppShell>
        <p className="text-sm text-red-600">{tasks.error.message}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Tareas</h1>

        <form
          onSubmit={handleSubmit((values) => create.mutate(values))}
          className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4"
          noValidate
        >
          <h2 className="text-sm font-medium text-slate-700">Nueva tarea</h2>
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Título de la tarea"
              {...register('title')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.title && (
              <span className="text-xs text-red-600">{errors.title.message}</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Descripción (opcional)"
              {...register('description')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <select
                {...register('teamId')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Equipo…</option>
                {teams.data?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {errors.teamId && (
                <span className="text-xs text-red-600">
                  {errors.teamId.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <select
                {...register('priority')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Prioridad…</option>
                {(
                  ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]
                ).map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="date"
              {...register('dueDate')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creando…' : 'Crear tarea'}
          </button>
        </form>

        {tasks.data.length === 0 && (
          <p className="text-sm text-slate-500">
            No hay tareas todavía. Crea la primera.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {tasks.data.map((task: TaskPresented) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">{task.title}</span>
                <div className="flex items-center gap-2">
                  {task.isOverdue && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium uppercase text-red-700">
                      Vencida
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                    {STATUS_LABELS[task.status]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
              </div>
              {task.description && (
                <p className="text-sm text-slate-500">{task.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {task.team.name}
                  {task.assignee ? ` · ${task.assignee.name}` : ''}
                </span>
                {task.dueDate && (
                  <span>{formatDate(task.dueDate)}</span>
                )}
              </div>
              <div className="flex gap-2">
                {task.status !== TaskStatus.DONE && (
                  <button
                    type="button"
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({
                        taskId: task.id,
                        status: TaskStatus.DONE,
                      })
                    }
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Completar
                  </button>
                )}
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(task.id)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
