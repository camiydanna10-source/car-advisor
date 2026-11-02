import { useCallback, useEffect, useState } from 'react';
import { SessionUser, getToken, getUserInfo } from '../services/authService';
import { getVehicles } from '../services/vehicleStorage';
import { VehicleData } from '../services/vehicleLookup';

export type SessionStatus = 'loading' | 'authenticated' | 'guest';

export interface Session {
  status: SessionStatus;
  user: SessionUser | null;
  vehicles: VehicleData[];
}

const EMPTY: Session = { status: 'loading', user: null, vehicles: [] };

async function loadSession(): Promise<Session> {
  const [token, user] = await Promise.all([getToken(), getUserInfo()]);
  if (!token || !user?.email) return { status: 'guest', user: null, vehicles: [] };
  return { status: 'authenticated', user, vehicles: await getVehicles(user.email) };
}

// Reads the JWT + user saved by authService and the vehicles saved locally for that user.
export function useSession() {
  const [session, setSession] = useState<Session>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    loadSession().then(loaded => {
      if (!cancelled) setSession(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(() => loadSession().then(setSession), []);

  return { ...session, refresh };
}
