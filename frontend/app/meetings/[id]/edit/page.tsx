'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { meetingsApi } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { toDatetimeLocal } from '@/lib/utils/format';

const editMeetingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'El título es obligatorio')
      .max(200, 'Máximo 200 caracteres'),
    description: z.string().trim().max(5000).optional(),
    startTime: z.string().min(1, 'La fecha de inicio es obligatoria'),
    endTime: z.string().min(1, 'La fecha de fin es obligatoria'),
    timezone: z.string().min(1, 'La zona horaria es obligatoria'),
    location: z.string().trim().max(255).optional(),
    meetingUrl: z.string().trim().max(2048).optional(),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: 'El fin debe ser posterior al inicio',
    path: ['endTime'],
  });
type EditMeetingInput = z.infer<typeof editMeetingSchema>;

export default function EditMeetingPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const session = useRequireSession();

  const meeting = useQuery({
    queryKey: ['meeting', params.id],
    queryFn: () => meetingsApi.get(params.id),
    enabled: Boolean(session.data?.user),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditMeetingInput>({
    resolver: zodResolver(editMeetingSchema),
  });

  useEffect(() => {
    if (!meeting.data) {
      return;
    }
    reset({
      title: meeting.data.title,
      description: meeting.data.description ?? '',
      startTime: toDatetimeLocal(
        meeting.data.startTime,
        meeting.data.timezone,
      ),
      endTime: toDatetimeLocal(meeting.data.endTime, meeting.data.timezone),
      timezone: meeting.data.timezone,
      location: meeting.data.location ?? '',
      meetingUrl: meeting.data.meetingUrl ?? '',
    });
  }, [meeting.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: EditMeetingInput) =>
      meetingsApi.update(params.id, {
        title: values.title,
        description: values.description || undefined,
        startTime: values.startTime,
        endTime: values.endTime,
        timezone: values.timezone,
        location: values.location || undefined,
        meetingUrl: values.meetingUrl || undefined,
      }),
    onSuccess: (updated) => router.replace(`/meetings/${updated.id}`),
  });

  return (
    <AppShell>
      <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/meetings/${params.id}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Volver a la reunión
        </Link>
        <h1 className="text-2xl font-semibold">Editar reunión</h1>
      </div>

      {meeting.isError ? (
        <p className="text-sm text-red-600">{meeting.error.message}</p>
      ) : (
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
              <span className="text-xs text-red-600">
                {errors.title.message}
              </span>
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
            {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}
      </div>
    </AppShell>
  );
}