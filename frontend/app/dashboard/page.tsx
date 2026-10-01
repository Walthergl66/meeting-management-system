'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { meetingsApi, tasksApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { formatDateTime } from '@/lib/utils/format';

export default function DashboardPage() {
  const session = useRequireSession();

  const meetings = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingsApi.list(),
    enabled: Boolean(session.data?.user),
  });

  const tasks = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list({ assigneeId: session.data?.user.id }),
    enabled: Boolean(session.data?.user),
  });

  if (session.isPending || meetings.isPending || tasks.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Cargando…</p>
      </AppShell>
    );
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todaysMeetings = (meetings.data ?? []).filter((m) => {
    const start = new Date(m.startTime);
    return start >= today && start < new Date(today.getTime() + 24 * 60 * 60 * 1000);
  });

  const upcomingMeetings = (meetings.data ?? []).filter((m) => {
    const start = new Date(m.startTime);
    return start >= new Date(today.getTime() + 24 * 60 * 60 * 1000) && start < nextWeek;
  });

  const pendingTasks = (tasks.data ?? []).filter(
    (t) => t.status !== 'DONE' && t.status !== 'CANCELLED',
  );

  const overdueTasks = pendingTasks.filter((t) => t.isOverdue);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Reuniones de hoy</p>
            <p className="text-2xl font-semibold">{todaysMeetings.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Próximas (7 días)</p>
            <p className="text-2xl font-semibold">{upcomingMeetings.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Tareas pendientes</p>
            <p className="text-2xl font-semibold">{pendingTasks.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Tareas vencidas</p>
            <p className="text-2xl font-semibold text-red-600">
              {overdueTasks.length}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">Reuniones de hoy</h2>
          {todaysMeetings.length === 0 ? (
            <p className="text-sm text-slate-500">No hay reuniones para hoy.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todaysMeetings.map((meeting) => (
                <li key={meeting.id} className="flex items-center justify-between text-sm">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <span className="text-slate-500">
                    {formatDateTime(meeting.startTime, meeting.timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">Tareas vencidas</h2>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes tareas vencidas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overdueTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{task.title}</span>
                  <span className="text-xs text-red-600">
                    Venció {task.dueDate ? formatDateTime(task.dueDate) : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">Tareas pendientes</h2>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes tareas pendientes.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendingTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{task.title}</span>
                  <span className="text-xs text-slate-400">
                    {task.dueDate ? formatDateTime(task.dueDate) : 'Sin fecha límite'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
