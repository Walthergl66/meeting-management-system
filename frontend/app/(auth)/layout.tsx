import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const FEATURES = [
  'Agenda y actas en un solo lugar',
  'Decisiones y tareas con responsable',
  'Recordatorios automáticos',
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-12 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl"
        />

        <Link href="/" aria-label="MeetFlow — Inicio" className="relative">
          <Logo tone="inverse" />
        </Link>

        <div className="relative flex max-w-md flex-col gap-8">
          <ul className="flex flex-col gap-3">
            {FEATURES.map((feature, index) => (
              <li
                key={feature}
                style={{ animationDelay: `${index * 70}ms` }}
                className="flex items-center gap-3 text-sm text-brand-50 animate-fade-up"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    className="h-3.5 w-3.5 text-white"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <figure className="flex flex-col gap-4 border-t border-white/15 pt-6">
            <blockquote className="text-xl font-medium leading-snug text-white">
              «MeetFlow nos quitó el caos de las reuniones: cada una termina con
              agenda, decisiones y tareas claras.»
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
                EP
              </span>
              <span className="text-sm text-brand-100">
                Equipo de Producto · MeetFlow
              </span>
            </figcaption>
          </figure>
        </div>

        <p className="relative text-xs text-brand-100/70">
          © {new Date().getFullYear()} MeetFlow
        </p>
      </aside>

      <main className="flex w-full justify-center px-6 py-12 lg:w-1/2">
        <div className="my-auto flex w-full flex-col">
          <Link
            href="/"
            aria-label="MeetFlow — Inicio"
            className="mb-10 lg:hidden"
          >
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}