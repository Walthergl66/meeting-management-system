'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { NotificationType } from '@/lib/shared';
import { notificationsApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/utils/format';

const TYPE_LABELS: Record<NotificationType, string> = {
  MEETING_INVITATION: 'Invitación a reunión',
  MEETING_UPDATED: 'Reunión actualizada',
  MEETING_CANCELLED: 'Reunión cancelada',
  MEETING_REMINDER: 'Recordatorio de reunión',
  TASK_ASSIGNED: 'Tarea asignada',
  TASK_DUE_SOON: 'Tarea por vencer',
  TASK_OVERDUE: 'Tarea vencida',
  MENTION: 'Mención',
  DECISION_CREATED: 'Nueva decisión',
};

const readMetadataId = (
  metadata: Record<string, unknown> | null,
  key: string,
): string | null => {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
};

const notificationLink = (
  type: NotificationType,
  metadata: Record<string, unknown> | null,
): { href: string; label: string } | null => {
  const meetingId = readMetadataId(metadata, 'meetingId');

  if (type === NotificationType.MEETING_INVITATION ||
    type === NotificationType.MEETING_UPDATED ||
    type === NotificationType.MEETING_CANCELLED ||
    type === NotificationType.DECISION_CREATED) {
    return meetingId
      ? { href: `/meetings/${meetingId}`, label: 'Ver reunión' }
      : null;
  }

  if (
    type === NotificationType.TASK_ASSIGNED ||
    type === NotificationType.TASK_DUE_SOON ||
    type === NotificationType.TASK_OVERDUE ||
    type === NotificationType.MENTION
  ) {
    return { href: '/tasks', label: 'Ver tareas' };
  }

  return null;
};

export default function NotificationsPage() {
  const session = useRequireSession();
  const queryClient = useQueryClient();

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    enabled: Boolean(session.data?.user),
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = notifications.data ?? [];
  const unread = items.filter((item) => !item.read);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notificaciones
          </h1>
          <p className="text-sm text-slate-500">
            {unread.length > 0
              ? `${unread.length} sin leer`
              : 'No tienes notificaciones sin leer'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => markAllAsRead.mutate()}
          disabled={markAllAsRead.isPending || unread.length === 0}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Marcar todas como leídas
        </button>
      </div>

      {notifications.isLoading && (
        <p className="mt-6 text-sm text-slate-500">Cargando…</p>
      )}

      {notifications.isError && (
        <p className="mt-6 text-sm text-red-600">
          No se pudieron cargar las notificaciones.
        </p>
      )}

      {!notifications.isLoading && items.length === 0 && (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Aún no tienes notificaciones.
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {items.map((item) => {
          const link = notificationLink(item.type, item.metadata);
          return (
            <li
              key={item.id}
              className={`rounded-lg border p-4 ${
                item.read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {TYPE_LABELS[item.type]}
                    </span>
                    {!item.read && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                        Nueva
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{item.title}</p>
                  {item.body && (
                    <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {link && (
                    <Link
                      href={link.href}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {link.label}
                    </Link>
                  )}
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => markAsRead.mutate(item.id)}
                      disabled={markAsRead.isPending}
                      className="text-sm text-slate-500 hover:text-slate-900 disabled:opacity-50"
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
