'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonClassName } from '@/components/ui/button';
import { disconnectRealtime } from '@/lib/auth/use-realtime';
import { useSession } from '@/lib/auth/use-session';

export function SessionNav() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();

  const handleLogout = () => {
    disconnectRealtime();
    sessionStorage.removeItem('meetflow.access_token');
    queryClient.clear();
    router.replace('/');
  };

  if (session.data?.user) {
    return (
      <div className="flex items-center gap-4">
        <span className="hidden max-w-32 truncate text-sm text-slate-500 md:block">
          {session.data.user.name}
        </span>
        <Link
          href="/meetings"
          className={buttonClassName('ghost', 'sm')}
        >
          Ir a la app
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/login" className={buttonClassName('ghost', 'sm')}>
        Iniciar sesión
      </Link>
      <Link href="/register" className={buttonClassName('primary', 'sm')}>
        Crear cuenta
      </Link>
    </div>
  );
}