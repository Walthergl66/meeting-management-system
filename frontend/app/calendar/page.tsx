'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { MeetingStatus } from '@/lib/shared';
import { MeetingPresented, meetingsApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { cn } from '@/lib/utils/format';
import {
  CalendarView,
  dayNumber,
  daySpan,
  isSameDay,
  isSameMonth,
  periodLabel,
  shiftPeriod,
  timeLabel,
  WEEKDAY_LABELS,
  weekdayLabel,
} from '@/lib/utils/calendar';
import { MEETING_STATUS_LABELS } from '@/lib/utils/labels';

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: 'MONTH', label: 'Mes' },
  { value: 'WEEK', label: 'Semana' },
  { value: 'DAY', label: 'Día' },
];

const STATUS_STYLES: Record<MeetingStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-800 border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

function MeetingChip({
  meeting,
  compact,
}: {
  meeting: MeetingPresented;
  compact: boolean;
}) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      title={`${meeting.title} · ${MEETING_STATUS_LABELS[meeting.status]}`}
      className={cn(
        'block truncate rounded border px-1.5 py-1 text-xs hover:underline',
        STATUS_STYLES[meeting.status],
        compact && 'mt-1',
      )}
    >
      {!compact && <span className="font-medium">{timeLabel(meeting.startTime)}</span>}{' '}
      {meeting.title}
    </Link>
  );
}

export default function CalendarPage() {
  const session = useRequireSession();
  const [view, setView] = useState<CalendarView>('MONTH');
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const meetings = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingsApi.list(),
    enabled: Boolean(session.data?.user),
  });

  const days = daySpan(anchor, view);
  const byDay = new Map<string, MeetingPresented[]>();
  for (const meeting of meetings.data ?? []) {
    const key = startKey(new Date(meeting.startTime));
    const current = byDay.get(key) ?? [];
    current.push(meeting);
    byDay.set(key, current);
  }

  const today = new Date();

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold capitalize">
            {periodLabel(anchor, view)}
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnchor(shiftPeriod(anchor, view, -1))}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50"
              aria-label="Periodo anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setAnchor(shiftPeriod(anchor, view, 1))}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50"
              aria-label="Periodo siguiente"
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex gap-1 self-start rounded-md border border-slate-200 bg-white p-1">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              className={cn(
                'rounded px-3 py-1 text-sm',
                view === option.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {meetings.isPending && (
          <p className="text-sm text-slate-500">Cargando reuniones…</p>
        )}

        {meetings.isError && (
          <p className="text-sm text-red-600">No se pudieron cargar las reuniones.</p>
        )}

        {view === 'MONTH' && !meetings.isPending && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const items = byDay.get(startKey(day)) ?? [];
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[6.5rem] border-b border-r border-slate-100 p-1.5',
                      !isSameMonth(day, anchor) && 'bg-slate-50/60',
                      isSameDay(day, today) && 'bg-blue-50/40',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-600',
                        isSameDay(day, today) && 'bg-slate-900 font-semibold text-white',
                      )}
                    >
                      {dayNumber(day)}
                    </span>
                    <div className="mt-1 space-y-1">
                      {items.slice(0, 3).map((meeting) => (
                        <MeetingChip key={meeting.id} meeting={meeting} compact />
                      ))}
                      {items.length > 3 && (
                        <p className="px-1 text-xs text-slate-500">
                          +{items.length - 3} más
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'WEEK' && !meetings.isPending && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <div className="grid min-w-[52rem] grid-cols-7 divide-x divide-slate-100">
              {days.map((day) => {
                const items = (byDay.get(startKey(day)) ?? []).sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
                );
                return (
                  <div key={day.toISOString()} className="min-h-[24rem] p-2">
                    <div
                      className={cn(
                        'mb-2 text-center text-xs',
                        isSameDay(day, today) ? 'font-semibold text-blue-700' : 'text-slate-500',
                      )}
                    >
                      <div>{weekdayLabel(day)}</div>
                      <div className="text-sm">{dayNumber(day)}</div>
                    </div>
                    <div className="space-y-1">
                      {items.map((meeting) => (
                        <div key={meeting.id}>
                          <p className="text-[11px] text-slate-400">
                            {timeLabel(meeting.startTime)}
                          </p>
                          <MeetingChip meeting={meeting} compact />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'DAY' && !meetings.isPending && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {(() => {
              const items = (byDay.get(startKey(days[0])) ?? []).sort(
                (a, b) =>
                  new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
              );
              if (items.length === 0) {
                return (
                  <p className="text-sm text-slate-500">
                    No hay reuniones para este día.
                  </p>
                );
              }
              return (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {items.map((meeting) => (
                    <li key={meeting.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {meeting.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {meeting.team.name} · {timeLabel(meeting.startTime)}–
                          {timeLabel(meeting.endTime)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded border px-2 py-0.5 text-xs',
                          STATUS_STYLES[meeting.status],
                        )}
                      >
                        {MEETING_STATUS_LABELS[meeting.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function startKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
