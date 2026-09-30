'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MEETING_STATUS_TRANSITIONS } from '@meetflow/config';
import { MeetingStatus } from '@meetflow/types';
import { meetingsApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { formatDateTime } from '@/lib/utils/format';

export default function MeetingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const session = useRequireSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const meeting = useQuery({
    queryKey: ['meeting', params.id],
    queryFn: () => meetingsApi.get(params.id),
    enabled: Boolean(session.data?.user),
  });

  const isOrganizer =
    meeting.data?.organizer.id === session.data?.user.id;

  const changeStatus = useMutation({
    mutationFn: (status: MeetingStatus) =>
      meetingsApi.update(params.id, { status }),
    onSuccess: async (updated) => {
      setError(null);
      queryClient.setQueryData(['meeting', params.id], updated);
    },
    onError: (err) => setError((err as Error).message),
  });

  const remove = useMutation({
    mutationFn: () => meetingsApi.remove(params.id),
    onSuccess: () => router.replace('/meetings'),
    onError: (err) => setError((err as Error).message),
  });

  if (session.isPending || meeting.isPending) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  if (meeting.isError) {
    return (
      <p className="text-sm text-red-600">{meeting.error.message}</p>
    );
  }

  const current = meeting.data;
  const nextStatuses =
    MEETING_STATUS_TRANSITIONS[current.status as string] ?? [];
  const isAdmin =
    !isOrganizer && (current.role === 'ADMIN' || current.role === 'OWNER');
  const allowedStatuses = isAdmin
    ? nextStatuses.filter((status) => status === 'CANCELLED')
    : nextStatuses;

  return (
    <AppShell>
      <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/meetings"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Volver a reuniones
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{current.title}</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
            {current.status}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Inicio</dt>
            <dd>{formatDateTime(current.startTime, current.timezone)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fin</dt>
            <dd>{formatDateTime(current.endTime, current.timezone)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Equipo</dt>
            <dd>{current.team.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Organizador</dt>
            <dd>{current.organizer.name}</dd>
          </div>
          {current.location && (
            <div>
              <dt className="text-slate-500">Ubicación</dt>
              <dd>{current.location}</dd>
            </div>
          )}
          {current.meetingUrl && (
            <div>
              <dt className="text-slate-500">Enlace</dt>
              <dd>
                <a
                  href={current.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  Abrir videollamada
                </a>
              </dd>
            </div>
          )}
        </dl>

        {current.description && (
          <p className="whitespace-pre-line text-sm text-slate-700">
            {current.description}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {(isOrganizer || isAdmin) && (
        <div className="flex flex-wrap gap-2">
          {isOrganizer && (
            <Link
              href={`/meetings/${current.id}/edit`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Editar
            </Link>
          )}
          {allowedStatuses.map((status) => (
              <button
                key={status}
                type="button"
                disabled={changeStatus.isPending}
                onClick={() => changeStatus.mutate(status as MeetingStatus)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Marcar {status.toLowerCase()}
              </button>
            ))}
          {isOrganizer && (
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Eliminar
            </button>
          )}
        </div>
      )}
      </div>
    </AppShell>
  );
}