import { useEffect } from 'react';
import { ServiceRecord } from '../services/maintenancePlan';
import { syncMaintenanceNotifications } from '../services/notifications';
import { VehicleData } from '../services/vehicleLookup';

// Keeps the scheduled maintenance reminders in line with the vehicles and history shown on screen.
export function useNotificationSync(
  email: string | undefined,
  vehicles: VehicleData[],
  recordsByPlate: Record<string, ServiceRecord[]>,
  ready: boolean
) {
  useEffect(() => {
    if (!email || !ready || vehicles.length === 0) return;
    syncMaintenanceNotifications(email, vehicles, recordsByPlate).catch(() => {
      // Scheduling is best effort: never break a screen because a reminder could not be set.
    });
  }, [email, vehicles, recordsByPlate, ready]);
}
