'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MEETING_STATUS_TRANSITIONS } from '@meetflow/config';
import {
  AttendanceStatus,
  MeetingStatus,
  ParticipantStatus,
} from '@meetflow/types';
import {
  agendaApi,
  decisionsApi,
  meetingsApi,
  notesApi,
  participantsApi,
  teamsApi,
} from '@/lib/api/entities';
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDuration, setAgendaDuration] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');

  const meeting = useQuery({
    queryKey: ['meeting', params.id],
    queryFn: () => meetingsApi.get(params.id),
    enabled: Boolean(session.data?.user),
  });

  const participants = useQuery({
    queryKey: ['participants', params.id],
    queryFn: () => participantsApi.list(params.id),
    enabled: Boolean(session.data?.user),
  });

  const agenda = useQuery({
    queryKey: ['agenda', params.id],
    queryFn: () => agendaApi.list(params.id),
    enabled: Boolean(session.data?.user),
  });

  const notes = useQuery({
    queryKey: ['notes', params.id],
    queryFn: () => notesApi.list(params.id),
    enabled: Boolean(session.data?.user),
  });

  const decisions = useQuery({
    queryKey: ['decisions', params.id],
    queryFn: () => decisionsApi.list(params.id),
    enabled: Boolean(session.data?.user),
  });

  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
    enabled: Boolean(session.data?.user),
  });

  const isOrganizer =
    meeting.data?.organizer.id === session.data?.user.id;
  const isAdmin =
    !isOrganizer && (meeting.data?.role === 'ADMIN' || meeting.data?.role === 'OWNER');
  const canManage = isOrganizer || isAdmin;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['meeting', params.id] });
    queryClient.invalidateQueries({ queryKey: ['participants', params.id] });
    queryClient.invalidateQueries({ queryKey: ['agenda', params.id] });
  };

  const changeStatus = useMutation({
    mutationFn: (status: MeetingStatus) =>
      meetingsApi.update(params.id, { status }),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const remove = useMutation({
    mutationFn: () => meetingsApi.remove(params.id),
    onSuccess: () => router.replace('/meetings'),
    onError: (err) => setError((err as Error).message),
  });

  const invite = useMutation({
    mutationFn: async (email: string) => {
      const team = teams.data?.find((t) => t.id === meeting.data?.team.id);
      if (!team) {
        throw new Error('Equipo no encontrado');
      }
      const members = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/teams/${team.id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('meetflow.access_token')}`,
          },
        },
      ).then((res) => res.json());
      const target = members.data?.members?.find(
        (m: { email: string }) => m.email === email,
      );
      if (!target) {
        throw new Error('El usuario no pertenece al equipo');
      }
      return participantsApi.invite(params.id, [target.userId]);
    },
    onSuccess: () => {
      setInviteEmail('');
      refresh();
    },
    onError: (err) => setError((err as Error).message),
  });

  const respond = useMutation({
    mutationFn: (status: ParticipantStatus) =>
      participantsApi.respond(params.id, status),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const recordAttendance = useMutation({
    mutationFn: ({
      userId,
      attendance,
    }: {
      userId: string;
      attendance: AttendanceStatus;
    }) => participantsApi.recordAttendance(params.id, userId, attendance),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const removeParticipant = useMutation({
    mutationFn: (userId: string) =>
      participantsApi.remove(params.id, userId),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const addAgendaItem = useMutation({
    mutationFn: () =>
      agendaApi.create(params.id, {
        title: agendaTitle,
        durationMinutes: agendaDuration
          ? Number(agendaDuration)
          : undefined,
      }),
    onSuccess: () => {
      setAgendaTitle('');
      setAgendaDuration('');
      refresh();
    },
    onError: (err) => setError((err as Error).message),
  });

  const removeAgendaItem = useMutation({
    mutationFn: (itemId: string) => agendaApi.remove(itemId),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const moveAgendaItem = useMutation({
    mutationFn: ({
      itemId,
      direction,
    }: {
      itemId: string;
      direction: 'up' | 'down';
    }) => {
      const items = agenda.data ?? [];
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) {
        throw new Error('Item no encontrado');
      }
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= items.length) {
        throw new Error('No se puede mover');
      }
      const newOrder = items.map((item) => item.id);
      [newOrder[index], newOrder[swapIndex]] = [
        newOrder[swapIndex],
        newOrder[index],
      ];
      return agendaApi.reorder(params.id, newOrder);
    },
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const addNote = useMutation({
    mutationFn: (content: string) => notesApi.create(params.id, content),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const removeNote = useMutation({
    mutationFn: (noteId: string) => notesApi.remove(noteId),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const addDecision = useMutation({
    mutationFn: (title: string) =>
      decisionsApi.create(params.id, { title }),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  const removeDecision = useMutation({
    mutationFn: (decisionId: string) => decisionsApi.remove(decisionId),
    onSuccess: refresh,
    onError: (err) => setError((err as Error).message),
  });

  if (session.isPending || meeting.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Cargando…</p>
      </AppShell>
    );
  }

  if (meeting.isError) {
    return (
      <AppShell>
        <p className="text-sm text-red-600">{meeting.error.message}</p>
      </AppShell>
    );
  }

  const current = meeting.data;
  const nextStatuses =
    MEETING_STATUS_TRANSITIONS[current.status as string] ?? [];
  const myParticipant = participants.data?.find(
    (p) => p.userId === session.data?.user.id,
  );

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
            {nextStatuses.map((status) => (
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

        {myParticipant && (
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium">Tu participación</h2>
            <p className="text-sm text-slate-500">
              Estado actual:{' '}
              <span className="font-medium">{myParticipant.status}</span>
            </p>
            <div className="flex gap-2">
              {(
                ['ACCEPTED', 'TENTATIVE', 'DECLINED'] as ParticipantStatus[]
              ).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={respond.isPending || myParticipant.status === status}
                  onClick={() => respond.mutate(status)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {status === 'ACCEPTED'
                    ? 'Aceptar'
                    : status === 'TENTATIVE'
                      ? 'Tentativo'
                      : 'Declinar'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">Participantes</h2>

          {canManage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                invite.mutate(inviteEmail);
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="correo@del-equipo.com"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={invite.isPending || !inviteEmail}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Invitar
              </button>
            </form>
          )}

          {participants.isPending ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {participants.data?.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{participant.name}</span>
                    <span className="text-xs text-slate-400">
                      {participant.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                      {participant.status}
                    </span>
                    {participant.attendance && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium uppercase text-green-700">
                        {participant.attendance}
                      </span>
                    )}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          disabled={recordAttendance.isPending}
                          onClick={() =>
                            recordAttendance.mutate({
                              userId: participant.userId,
                              attendance: 'ATTENDED',
                            })
                          }
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Asistió
                        </button>
                        <button
                          type="button"
                          disabled={recordAttendance.isPending}
                          onClick={() =>
                            recordAttendance.mutate({
                              userId: participant.userId,
                              attendance: 'ABSENT',
                            })
                          }
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Ausente
                        </button>
                        {participant.userId !== current.organizer.id && (
                          <button
                            type="button"
                            disabled={removeParticipant.isPending}
                            onClick={() =>
                              removeParticipant.mutate(participant.userId)
                            }
                            className="text-xs text-red-600 hover:underline"
                          >
                            Quitar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">Agenda</h2>

          {canManage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addAgendaItem.mutate();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={agendaTitle}
                onChange={(e) => setAgendaTitle(e.target.value)}
                placeholder="Nuevo punto de agenda"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={agendaDuration}
                onChange={(e) => setAgendaDuration(e.target.value)}
                placeholder="Min"
                min={1}
                max={480}
                className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={addAgendaItem.isPending || !agendaTitle}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Agregar
              </button>
            </form>
          )}

          {agenda.isPending ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {agenda.data?.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {index + 1}. {item.title}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.durationMinutes
                        ? `${item.durationMinutes} min`
                        : 'Sin duración'}
                      {item.responsible
                        ? ` · ${item.responsible.name}`
                        : ''}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={moveAgendaItem.isPending || index === 0}
                        onClick={() =>
                          moveAgendaItem.mutate({ itemId: item.id, direction: 'up' })
                        }
                        className="text-xs text-slate-500 hover:underline disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={
                          moveAgendaItem.isPending ||
                          index === (agenda.data?.length ?? 0) - 1
                        }
                        onClick={() =>
                          moveAgendaItem.mutate({ itemId: item.id, direction: 'down' })
                        }
                        className="text-xs text-slate-500 hover:underline disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={removeAgendaItem.isPending}
                        onClick={() => removeAgendaItem.mutate(item.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {myParticipant && (
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium">Notas</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addNote.mutate(noteContent);
                setNoteContent('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Escribe una nota…"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={addNote.isPending || !noteContent}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Agregar
              </button>
            </form>
            {notes.isPending ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notes.data?.map((note) => (
                  <li
                    key={note.id}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <div className="flex flex-col">
                      <span>{note.content}</span>
                      <span className="text-xs text-slate-400">
                        {note.author.name}
                      </span>
                    </div>
                    {(note.author.id === session.data?.user.id || isOrganizer) && (
                      <button
                        type="button"
                        disabled={removeNote.isPending}
                        onClick={() => removeNote.mutate(note.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {myParticipant && (
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium">Decisiones</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addDecision.mutate(decisionTitle);
                setDecisionTitle('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={decisionTitle}
                onChange={(e) => setDecisionTitle(e.target.value)}
                placeholder="Registra una decisión…"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={addDecision.isPending || !decisionTitle}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Agregar
              </button>
            </form>
            {decisions.isPending ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {decisions.data?.map((decision) => (
                  <li
                    key={decision.id}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{decision.title}</span>
                      {decision.content && (
                        <span className="text-slate-600">
                          {decision.content}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {decision.author.name}
                      </span>
                    </div>
                    {(decision.author.id === session.data?.user.id ||
                      isOrganizer) && (
                      <button
                        type="button"
                        disabled={removeDecision.isPending}
                        onClick={() => removeDecision.mutate(decision.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
