import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { buttonClassName } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'MeetFlow — Gestión profesional de reuniones',
};

const FEATURES = [
  {
    title: 'Calendario y agenda',
    description:
      'Planifica reuniones con agenda previa y visualiza tus próximos compromisos en un solo lugar.',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  },
  {
    title: 'Equipos organizados',
    description:
      'Agrupa a las personas adecuadas en equipos para mantener reuniones y responsables claros.',
    icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  },
  {
    title: 'Notas y decisiones',
    description:
      'Registra notas, decisiones y acuerdos durante la reunión para no perder contexto.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z',
  },
  {
    title: 'Tareas con responsables',
    description:
      'Convierte cada punto de la reunión en tareas asignadas con fecha de vencimiento.',
    icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4',
  },
  {
    title: 'Notificaciones en tiempo real',
    description:
      'Entérate al instante de cambios, asignaciones y recordatorios vía WebSocket.',
    icon: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
  },
  {
    title: 'Decisiones con seguimiento',
    description:
      'Cada decisión queda vinculada a su reunión para auditar el avance del equipo.',
    icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
];

function FeatureIcon({ icon }: { icon: string }) {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={icon}
        />
      </svg>
    </span>
  );
}

function MeetingRow({
  time,
  title,
  team,
}: {
  time: string;
  title: string;
  team: string;
}) {
  return (
    <li className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
      <span className="w-12 shrink-0 text-xs font-medium text-slate-500">
        {time}
      </span>
      <span className="h-8 w-0.5 rounded-full bg-brand-200" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{team}</p>
      </div>
    </li>
  );
}

function HeroPreview() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card-lg sm:p-7">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <p className="text-sm font-semibold text-slate-900">
            Reuniones de hoy
          </p>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
            Jueves
          </span>
        </div>
        <ul className="mt-5 flex flex-col gap-3">
          <MeetingRow
            time="09:00"
            title="Planificación del sprint"
            team="Equipo Producto"
          />
          <MeetingRow
            time="10:30"
            title="Revisión de diseño"
            team="Equipo UX"
          />
          <MeetingRow
            time="14:00"
            title="Seguimiento de tareas"
            team="Equipo Backend"
          />
        </ul>
      </div>

      <div className="absolute -left-8 -bottom-6 hidden rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-card sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-3.5 w-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </span>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-900">
              Decisión tomada
            </p>
            <p className="text-[10px] text-slate-500">
              React 19 · En votación
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <section className="relative flex min-h-[560px] flex-1 items-center overflow-hidden py-16 lg:py-24">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[calc(100%+4rem)] bg-gradient-to-b from-brand-50 via-brand-50/40 to-white"
        />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-6 py-8 lg:grid-cols-2 lg:px-10">
          <div className="flex flex-col items-start gap-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Reuniones eficientes · Equipos alineados
            </span>

            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Reuniones que terminan en{' '}
              <span className="text-brand-600">decisiones claras</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              MeetFlow centraliza calendario, agenda, notas, decisiones y
              tareas de tus reuniones para que tu equipo avance en lugar de
              solo reunirse.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className={buttonClassName('primary', 'lg')}
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="#features"
                className={buttonClassName('outline', 'lg')}
              >
                Ver características
              </Link>
            </div>

            <p className="text-xs text-slate-400">
              Sin tarjeta de crédito · Listo en minutos
            </p>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-28 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Todo lo que necesitas en la reunión
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 sm:text-xl">
              Una plataforma que acompaña el ciclo completo de una reunión:
              antes, durante y después.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-card transition-shadow hover:shadow-card-lg"
              >
                <FeatureIcon icon={feature.icon} />
                <h3 className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-base leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="scroll-mt-28 pb-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-20 text-center shadow-card-lg sm:px-12 lg:py-24">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brand-400/20 blur-2xl"
            />

            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
              <LogoMark className="h-11 w-11" />
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Deja de perder tiempo en reuniones
              </h2>
              <p className="text-lg leading-relaxed text-brand-100 sm:text-xl">
                Crea tu cuenta gratis y empieza a convertir cada reunión en
                resultados medibles.
              </p>
              <Link
                href="/register"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-base font-medium text-brand-700 shadow-sm transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}