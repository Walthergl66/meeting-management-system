'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { meetingsApi, teamsApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';

const createMeetingSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    teamId: z.string().min(1, 'Selecciona un equipo'),
    startTime: z.string().min(1, 'La fecha de inicio es obligatoria'),
    endTime: z.string().min(1, 'La fecha de fin es obligatoria'),
    timezone: z.string().min(1),
    location: z.string().trim().max(255).optional(),
    meetingUrl: z.string().trim().max(2048).optional(),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: 'El fin debe ser posterior al inicio',
    path: ['endTime'],
  });
type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export default function NewMeetingPage() {
  const router = useRouter();
  const session = useRequireSession();

  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
    enabled: Boolean(session.data?.user),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateMeetingInput>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateMeetingInput) =>
      meetingsApi.create({
        title: values.title,
        description: values.description || undefined,
        teamId: values.teamId,
        startTime: values.startTime,
        endTime: values.endTime,
        timezone: values.timezone,
        location: values.location || undefined,
        meetingUrl: values.meetingUrl || undefined,
      }),
    onSuccess: (meeting) => router.replace(`/meetings/${meeting.id}`),
  });

  return (
    <AppShell>
      <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/meetings" className="text-sm text-slate-500 hover:underline">
          ← Volver a reuniones
        </Link>
        <h1 className="text-2xl font-semibold">Nueva reunión</h1>
      </div>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6"
        noValidate
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Título</span>
          <input
            type="text"
            {...register('title')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.title && (
            <span className="text-xs text-red-600">{errors.title.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            Descripción (opcional)
          </span>
          <textarea
            rows={3}
            {...register('description')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.description && (
            <span className="text-xs text-red-600">
              {errors.description.message}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Equipo</span>
          <select
            {...register('teamId')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecciona un equipo…</option>
            {teams.data?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {errors.teamId && (
            <span className="text-xs text-red-600">{errors.teamId.message}</span>
          )}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Inicio</span>
            <input
              type="datetime-local"
              {...register('startTime')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.startTime && (
              <span className="text-xs text-red-600">
                {errors.startTime.message}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Fin</span>
            <input
              type="datetime-local"
              {...register('endTime')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.endTime && (
              <span className="text-xs text-red-600">
                {errors.endTime.message}
              </span>
            )}
          </label>
        </div>

        <p className="text-xs text-slate-400">
          Zona horaria: {watch('timezone') || '…'}
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            Ubicación (opcional)
          </span>
          <input
            type="text"
            {...register('location')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            Enlace de videollamada (opcional)
          </span>
          <input
            type="url"
            {...register('meetingUrl')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.meetingUrl && (
            <span className="text-xs text-red-600">
              {errors.meetingUrl.message}
            </span>
          )}
        </label>

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {(mutation.error as Error).message}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Creando…' : 'Crear reunión'}
        </button>
      </form>
      </div>
    </AppShell>
  );
}