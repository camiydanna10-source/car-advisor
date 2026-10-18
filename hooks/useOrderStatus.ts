import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ServiceOrder, SosAlert, getOrder, getSosAlert, listOrders } from '../services/orders';

const POLL_MS = 3000;

// Same object when nothing changed, so a screen does not re-render on every poll.
const keepIfEqual = <T,>(prev: T, next: T) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next);

// Polls a record while the screen is focused. Stand-in for the realtime channel (WebSocket/push)
// the backend will provide: the screens only need `undefined` (loading) / `null` (missing) / value.
function usePolled<T>(load: () => Promise<T>, enabled: boolean, deps: unknown[]) {
  const [value, setValue] = useState<T | undefined>(undefined);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      let cancelled = false;
      if (!enabled) return;
      const refresh = () =>
        load().then(next => {
          if (!cancelled) setValue(prev => (prev === undefined ? next : keepIfEqual(prev, next)));
        });
      refresh();
      const timer = setInterval(refresh, POLL_MS);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [enabled, ...deps])
  );

  return value;
}

/** One order by id: `undefined` while loading, `null` when it does not exist. */
export function useOrder(id: string | undefined) {
  return usePolled<ServiceOrder | null>(async () => (id ? (await getOrder(id)) ?? null : null), Boolean(id), [id]);
}

/** One SOS alert by id: `undefined` while loading, `null` when it does not exist. */
export function useSosAlert(id: string | undefined) {
  return usePolled<SosAlert | null>(async () => (id ? (await getSosAlert(id)) ?? null : null), Boolean(id), [id]);
}

/** The orders of a client (by e-mail), newest first. */
export function useClientOrders(email: string | undefined) {
  return usePolled<ServiceOrder[]>(
    async () => (email ? (await listOrders()).filter(o => o.client.email === email) : []),
    Boolean(email),
    [email]
  );
}
