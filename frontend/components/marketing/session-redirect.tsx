'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/entities';
import { tokenStore } from '@/lib/auth/token-store';

function HomeLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
      />
    </div>
  );
}

export function SessionRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!tokenStore.hydrate()) {
        setReady(true);
        return;
      }
      try {
        await authApi.me();
        if (!cancelled) {
          router.replace('/meetings');
        }
      } catch {
        tokenStore.set(null);
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return <HomeLoader />;
  }

  return <>{children}</>;
}