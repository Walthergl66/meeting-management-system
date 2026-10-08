'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { meetingsApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { formatDateTime } from '@/lib/utils/format';
import { MEETING_STATUS_LABELS } from '@/lib/utils/labels';

export default function MeetingsPage() {
  const session = useRequireSession();

  const meetings = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingsApi.list(),
    enabled: Boolean(session.data?.user),
  });

  if (session.isPending || meetings.isPending) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  if (meetings.isError) {
    return (
      <p className="text-sm text-red-600">{meetings.error.message}</p>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reuniones</h1>
        <Link
          href="/meetings/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nueva reunión
        </Link>
      </div>

      {meetings.data.length === 0 && (
        <p className="text-sm text-slate-500">
          No hay reuniones todavía. Crea la primera.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {meetings.data.map((meeting) => (
          <li
            key={meeting.id}
            className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <Link
                href={`/meetings/${meeting.id}`}
                className="font-medium text-slate-900 hover:underline"
              >
                {meeting.title}
              </Link>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                {MEETING_STATUS_LABELS[meeting.status]}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {formatDateTime(meeting.startTime, meeting.timezone)} ·{' '}
              {meeting.team.name} · {meeting.organizer.name}
            </p>
          </li>
        ))}
      </ul>
      </div>
    </AppShell>
  );
}