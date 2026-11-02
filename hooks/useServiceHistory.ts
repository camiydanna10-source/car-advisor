import { useCallback, useEffect, useState } from 'react';
import { ServiceRecord } from '../services/maintenancePlan';
import { getAllRecords } from '../services/serviceHistoryStorage';
import { VehicleData } from '../services/vehicleLookup';

// Loads the saved service history of every vehicle of the client, keyed by plate.
export function useServiceHistory(email: string | undefined, vehicles: VehicleData[]) {
  const [state, setState] = useState<{ loaded: boolean; byPlate: Record<string, ServiceRecord[]> }>({
    loaded: false,
    byPlate: {},
  });
  const plateKey = vehicles.map(v => v.plate).join(',');

  const reload = useCallback(async () => {
    if (!email) return;
    const byPlate = await getAllRecords(email, plateKey ? plateKey.split(',') : []);
    setState({ loaded: true, byPlate });
  }, [email, plateKey]);

  useEffect(() => {
    let cancelled = false;
    if (!email) return;
    getAllRecords(email, plateKey ? plateKey.split(',') : []).then(byPlate => {
      if (!cancelled) setState({ loaded: true, byPlate });
    });
    return () => {
      cancelled = true;
    };
  }, [email, plateKey]);

  return { ...state, reload };
}
