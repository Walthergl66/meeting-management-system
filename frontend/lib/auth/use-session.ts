'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authApi, UserProfile } from '@/lib/api/entities';
import { tokenStore } from '@/lib/auth/token-store';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      if (!tokenStore.hydrate()) {
        return null;
      }
      const user = await authApi.me();
      return { user } as { user: UserProfile };
    },
    retry: false,
  });
}

export function useRequireSession() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.isSuccess && !session.data) {
      router.replace('/login');
    }
  }, [session.isSuccess, session.data, router]);

  return session;
}