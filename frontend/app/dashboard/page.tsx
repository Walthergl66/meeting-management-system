'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ActivityEntry, dashboardApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { formatDateTime } from '@/lib/utils/format';

const ACTIVITY_LABELS: Record<ActivityEntry['type'], string> = {
  MEETING_CREATED: 'Reunión creada',
  MEETING_UPDATED: 'Reunión actualizada',
  DECISION_CREATED: 'Decisión',
  NOTE_CREATED: 'Nota',
  TASK_CREATED: 'Tarea',
};

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        {action && (
          <Link href={action.href} className="text-sm text-slate-500 hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-slate-500">{message}</p>;
}

export default function DashboardPage() {
  const session = useRequireSession();

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.summary(),
    enabled: Boolean(session.data?.user),
  });

  if (session.isPending || dashboard.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Cargando…</p>
      </AppShell>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <AppShell>
        <p className="text-sm text-red-600">
          No se pudo cargar el dashboard.
        </p>
      </AppShell>
    );
  }

  const data = dashboard.data;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Reuniones de hoy" value={data.metrics.todayMeetings} />
          <Metric label="Próximas (7 días)" value={data.metrics.upcomingMeetings} />
          <Metric label="Tareas pendientes" value={data.metrics.pendingTasks} />
          <Metric
            label="Tareas vencidas"
            value={data.metrics.overdueTasks}
            tone={data.metrics.overdueTasks > 0 ? 'danger' : 'default'}
          />
        </div>

        <Section title="Reuniones de hoy" action={{ href: '/calendar', label: 'Ver calendario' }}>
          {data.todayMeetings.length === 0 ? (
            <EmptyState message="No hay reuniones para hoy." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.todayMeetings.map((meeting) => (
                <li key={meeting.id} className="flex items-center justify-between gap-4 text-sm">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <span className="text-slate-500">
                    {formatDateTime(meeting.startTime)} · {meeting.team.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Próximas reuniones">
          {data.upcomingMeetings.length === 0 ? (
            <EmptyState message="No hay reuniones programadas en los próximos 7 días." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.upcomingMeetings.map((meeting) => (
                <li key={meeting.id} className="flex items-center justify-between gap-4 text-sm">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <span className="text-slate-500">
                    {formatDateTime(meeting.startTime)} · {meeting.team.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Reuniones recientes">
          {data.recentMeetings.length === 0 ? (
            <EmptyState message="No hay reuniones pasadas recientes." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentMeetings.map((meeting) => (
                <li key={meeting.id} className="flex items-center justify-between gap-4 text-sm">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <span className="text-slate-500">
                    {formatDateTime(meeting.startTime)} · {meeting.team.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Tareas pendientes" action={{ href: '/tasks', label: 'Ver tareas' }}>
          {data.pendingTasks.length === 0 ? (
            <EmptyState message="No tienes tareas pendientes." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.pendingTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-slate-900">{task.title}</span>
                  <span className={task.isOverdue ? 'text-xs text-red-600' : 'text-xs text-slate-400'}>
                    {task.dueDate ? formatDateTime(task.dueDate) : 'Sin fecha límite'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Tareas vencidas">
          {data.overdueTasks.length === 0 ? (
            <EmptyState message="No tienes tareas vencidas." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.overdueTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-slate-900">{task.title}</span>
                  <span className="text-xs text-red-600">
                    Venció {task.dueDate ? formatDateTime(task.dueDate) : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Decisiones recientes">
          {data.recentDecisions.length === 0 ? (
            <EmptyState message="Aún no hay decisiones registradas en tus equipos." />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.recentDecisions.map((decision) => (
                <li key={decision.id} className="text-sm">
                  <div className="flex items-center justify-between gap-4">
                    {decision.meetingId ? (
                      <Link
                        href={`/meetings/${decision.meetingId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {decision.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-900">{decision.title}</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDateTime(decision.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {decision.author.name}
                    {decision.teamName ? ` · ${decision.teamName}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Actividad reciente">
          {data.recentActivity.length === 0 ? (
            <EmptyState message="No hay actividad reciente en tus equipos." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentActivity.map((entry) => (
                <li key={`${entry.type}-${entry.occurredAt}-${entry.title}`} className="flex items-start justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {ACTIVITY_LABELS[entry.type]}
                    </span>
                    {entry.meetingId ? (
                      <Link
                        href={`/meetings/${entry.meetingId}`}
                        className="text-slate-800 hover:underline"
                      >
                        {entry.title}
                      </Link>
                    ) : (
                      <span className="text-slate-800">{entry.title}</span>
                    )}
                    {entry.teamName && (
                      <span className="ml-2 text-xs text-slate-400">{entry.teamName}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDateTime(entry.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${tone === 'danger' ? 'text-red-600' : ''}`}>
        {value}
      </p>
    </div>
  );
}
