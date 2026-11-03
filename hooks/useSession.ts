import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { SessionUser, UserRole, getToken, getUserInfo } from '../services/authService';
import { getPhone } from '../services/profileStorage';
import { getVehicles } from '../services/vehicleStorage';
import { VehicleData } from '../services/vehicleLookup';

export type SessionStatus = 'loading' | 'authenticated' | 'guest';

export interface Session {
  status: SessionStatus;
  user: SessionUser | null;
  role: UserRole;
  vehicles: VehicleData[];
  /** Contact phone of the client (international format), when known. */
  phone?: string;
}

const EMPTY: Session = { status: 'loading', user: null, role: 'client', vehicles: [] };

async function loadSession(): Promise<Session> {
  const [token, user] = await Promise.all([getToken(), getUserInfo()]);
  if (!token || !user?.email) return { status: 'guest', user: null, role: 'client', vehicles: [] };
  const role: UserRole = user.role === 'mechanic' ? 'mechanic' : 'client';
  const [vehicles, phone] = await Promise.all([
    role === 'client' ? getVehicles(user.email) : Promise.resolve([] as VehicleData[]),
    getPhone(user.email),
  ]);
  return { status: 'authenticated', user, role, vehicles, phone };
}

// Reads the JWT + user saved by authService and the vehicles saved locally for that user.
export function useSession() {
  const [session, setSession] = useState<Session>(EMPTY);

  // Reload every time the screen gains focus: tab screens stay mounted, so without this they
  // would keep showing stale data after another screen changed it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadSession().then(loaded => {
        if (!cancelled) setSession(loaded);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const refresh = useCallback(() => loadSession().then(setSession), []);

  return { ...session, refresh };
}
