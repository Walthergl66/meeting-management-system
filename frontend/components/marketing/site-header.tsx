import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { buttonClassName } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="MeetFlow — Inicio">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="transition-colors hover:text-slate-900">
            Características
          </a>
          <a href="#cta" className="transition-colors hover:text-slate-900">
            Empieza
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={buttonClassName('ghost', 'sm')}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className={buttonClassName('primary', 'sm')}
          >
            Crear cuenta
          </Link>
        </div>
      </nav>
    </header>
  );
}