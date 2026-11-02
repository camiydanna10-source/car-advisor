import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ServiceOrder,
  SosAlert,
  getShiftActive,
  listOrders,
  listSosAlerts,
  onWorkshopChange,
} from '../services/orders';

interface WorkshopState {
  loaded: boolean;
  orders: ServiceOrder[];
  alerts: SosAlert[];
  shiftActive: boolean;
}

const EMPTY: WorkshopState = { loaded: false, orders: [], alerts: [], shiftActive: true };

async function load(email: string): Promise<WorkshopState> {
  const [orders, alerts, shiftActive] = await Promise.all([listOrders(), listSosAlerts(), getShiftActive(email)]);
  return { loaded: true, orders, alerts, shiftActive };
}

// Orders, SOS alerts and shift of the mechanic; reloaded every time the screen gains focus.
export function useWorkshop(email: string | undefined) {
  const [state, setState] = useState<WorkshopState>(EMPTY);

  const reload = useCallback(async () => {
    if (email) setState(await load(email));
  }, [email]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!email) return;
      const refresh = () =>
        load(email).then(next => {
          // Keep the same object when nothing changed so the screen does not re-render every tick.
          if (!cancelled) setState(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        });
      refresh();
      const unsubscribe = onWorkshopChange(refresh);
      // Stand-in for the realtime channel (WebSocket/push) the backend will provide.
      const timer = setInterval(refresh, 3000);
      return () => {
        cancelled = true;
        clearInterval(timer);
        unsubscribe();
      };
    }, [email])
  );

  return { ...state, reload };
}

/** SOS alerts waiting for an answer from this mechanic (0 when they are off guard). */
export function useOpenSosCount(email: string | undefined, enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!email || !enabled) return;
    let cancelled = false;
    const tick = async () => {
      const [shift, alerts] = await Promise.all([getShiftActive(email), listSosAlerts()]);
      const open = shift ? alerts.filter(a => a.status === 'open' && !a.rejectedBy.includes(email)).length : 0;
      if (!cancelled) setCount(open);
    };
    tick().catch(() => {});
    const timer = setInterval(() => tick().catch(() => {}), 3000);
    const unsubscribe = onWorkshopChange(() => tick().catch(() => {}));
    return () => {
      cancelled = true;
      clearInterval(timer);
      unsubscribe();
    };
  }, [email, enabled]);

  return enabled ? count : 0;
}
