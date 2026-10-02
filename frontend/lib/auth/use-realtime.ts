'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { tokenStore } from './token-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Salas de las que el cliente necesita refresco. Cada evento de tiempo real
 * invalida la query afectada para que React Query vuelva a pedir los datos por
 * REST: la mutación siempre ocurre por REST, el socket solo avisa.
 */
const INVALIDATIONS: Record<string, Array<[string, string?]>> = {
  'notification:new': [['notifications']],
  'meeting:created': [['meetings'], ['dashboard']],
  'meeting:updated': [['meetings'], ['dashboard'], ['calendar']],
  'meeting:cancelled': [['meetings'], ['dashboard'], ['calendar']],
  'task:changed': [['tasks'], ['dashboard']],
  'decision:created': [['decisions'], ['dashboard']],
};

const MEETING_SCOPED: Record<string, string> = {
  'meeting:updated': 'meeting',
  'meeting:cancelled': 'meeting',
  'meeting:participants:changed': 'participants',
  'agenda:changed': 'agenda',
  'decision:created': 'decisions',
  'task:changed': 'tasks',
};

let socket: Socket | null = null;

function ensureSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  const token = tokenStore.hydrate();
  if (!token) return null;

  if (socket?.connected || socket?.active) return socket;

  socket = io(`${API_URL}/realtime`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Mantiene una conexión de tiempo real mientras el usuario esté autenticado.
 * La conexión se lazily crea para no abrirla antes de tener token.
 */
export function useRealtime(): void {
  const queryClient = useQueryClient();
  const meetingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const client = ensureSocket();
    if (!client) return;

    const handlers = Object.entries(INVALIDATIONS).map(([event, targets]) => {
      const handler = () => {
        for (const [key, param] of targets) {
          queryClient.invalidateQueries({ queryKey: [key, param] });
        }
      };
      client.on(event, handler);
      return { event, handler };
    });

    return () => {
      for (const { event, handler } of handlers) {
        client.off(event, handler);
      }
    };
  }, [queryClient]);

  useEffect(() => {
    const client = ensureSocket();
    if (!client) return;

    const meetingHandlers = Object.entries(MEETING_SCOPED).map(
      ([event, key]) => {
        const handler = () => {
          const meetingId = meetingIdRef.current;
          queryClient.invalidateQueries({ queryKey: [key, meetingId] });
          queryClient.invalidateQueries({ queryKey: [key] });
        };
        client.on(event, handler);
        return { event, handler };
      },
    );

    return () => {
      for (const { event, handler } of meetingHandlers) {
        client.off(event, handler);
      }
    };
  }, [queryClient]);
}

/**
 * Entra y sale de la sala de una reunión en curso. El detalle de la reunión
 * refresca solo lo que esa reunión cambió.
 */
export function useMeetingRoom(meetingId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = ensureSocket();
    if (!client || !meetingId) return;

    let active = true;

    const join = () => {
      if (!active) return;
      client.emit('meeting:join', { meetingId });
    };

    client.emit('meeting:join', { meetingId });

    const refresh = () => {
      for (const key of [
        'meeting',
        'participants',
        'agenda',
        'notes',
        'decisions',
        'tasks',
      ]) {
        queryClient.invalidateQueries({ queryKey: [key, meetingId] });
      }
    };

    const scopedEvents = [
      'meeting:updated',
      'meeting:cancelled',
      'meeting:participants:changed',
      'agenda:changed',
      'decision:created',
      'task:changed',
    ];
    for (const event of scopedEvents) {
      client.on(event, refresh);
    }
    client.on('connect', join);

    return () => {
      active = false;
      for (const event of scopedEvents) {
        client.off(event, refresh);
      }
      client.off('connect', join);
      client.emit('meeting:leave', { meetingId });
    };
  }, [meetingId, queryClient]);
}

/** Suscripción puntual a un evento, para lógica que no es invalidación. */
export function useRealtimeEvent(
  event: string,
  handler: (payload: unknown) => void,
): void {
  useEffect(() => {
    const client = ensureSocket();
    if (!client) return;

    client.on(event, handler);
    return () => {
      client.off(event, handler);
    };
  }, [event, handler]);
}
