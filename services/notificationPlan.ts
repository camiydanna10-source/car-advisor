import { MaintenanceItem, MaintenanceKind, ServiceRecord, buildMaintenancePlan, formatDate, parseISODate } from './maintenancePlan';
import type { VehicleData } from './vehicleLookup';
import { formatPlate } from './vehicleLookup';

// Pure scheduling rules: which local notifications should exist for the client's vehicles.
// It only uses items backed by real dates / records (basis = 'registered'); estimates from the
// year and mileage alone never notify. The same rules are what a backend push job should apply
// (see "NOTAS PARA BACKEND" in the commit).

export interface PlannedNotification {
  /** Stable id: scheduling again replaces the previous one instead of duplicating it. */
  id: string;
  title: string;
  body: string;
  date: Date;
  plate: string;
  kind: MaintenanceKind;
}

/** Days before the due date at which a reminder goes out (0 = the due day itself). */
export const REMINDER_OFFSETS = [30, 7, 0];
const SEND_HOUR = 10;

const atSendHour = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), SEND_HOUR, 0, 0);

// Next 10:00 that is still in the future.
const nextSlot = (now: Date) => {
  const today = atSendHour(now);
  return today.getTime() > now.getTime() + 60_000 ? today : atSendHour(new Date(now.getTime() + 86_400_000));
};

// Notification wording per maintenance area.
const TEXT: Record<MaintenanceKind, { overdue: string; soon: string; today: string; inDays: (n: number) => string }> = {
  itv: {
    overdue: 'Tu ITV está vencida',
    soon: 'Se acerca tu ITV',
    today: 'Hoy vence tu ITV',
    inDays: n => `Tu ITV vence en ${n} días`,
  },
  oil: {
    overdue: 'Toca cambiar el aceite',
    soon: 'Se acerca el cambio de aceite',
    today: 'Hoy toca el cambio de aceite',
    inDays: n => `Cambio de aceite en ${n} días`,
  },
  tires: {
    overdue: 'Revisión de neumáticos pendiente',
    soon: 'Se acerca la revisión de neumáticos',
    today: 'Hoy toca revisar los neumáticos',
    inDays: n => `Revisión de neumáticos en ${n} días`,
  },
  diagnostic: {
    overdue: 'Diagnóstico OBD-II pendiente',
    soon: 'Se acerca tu diagnóstico OBD-II',
    today: 'Hoy toca el diagnóstico OBD-II',
    inDays: n => `Diagnóstico OBD-II en ${n} días`,
  },
};

function notificationsFor(vehicle: VehicleData, item: MaintenanceItem, now: Date): PlannedNotification[] {
  if (item.basis !== 'registered') return [];
  const car = `${vehicle.brand} ${vehicle.model} (${formatPlate(vehicle.plate)})`;
  const out: PlannedNotification[] = [];
  const base = { plate: vehicle.plate, kind: item.kind };

  if (item.dueDate) {
    const due = parseISODate(item.dueDate);
    for (const offset of REMINDER_OFFSETS) {
      const when = atSendHour(new Date(due.getFullYear(), due.getMonth(), due.getDate() - offset, 12));
      if (when.getTime() <= now.getTime() + 60_000) continue;
      const text = TEXT[item.kind];
      const title = offset === 0 ? text.today : text.inDays(offset);
      out.push({
        ...base,
        id: `${vehicle.plate}:${item.kind}:d${offset}`,
        title,
        // Written for the delivery day, not for today (the reason text counts days from now).
        body: `${car}: ${offset === 0 ? 'vence hoy' : `vence el ${formatDate(due)}`}. Reserva tu cita en CarAdvisor.`,
        date: when,
      });
    }
  }

  if (item.reminderNow) {
    const overdue = item.status === 'overdue';
    out.push({
      ...base,
      id: `${vehicle.plate}:${item.kind}:now`,
      title: overdue ? TEXT[item.kind].overdue : TEXT[item.kind].soon,
      body: `${car}: ${item.reason}`,
      date: nextSlot(now),
    });
  }
  return out;
}

export function buildNotificationPlan(
  vehicles: VehicleData[],
  recordsByPlate: Record<string, ServiceRecord[]>,
  now = new Date()
): PlannedNotification[] {
  const all = vehicles.flatMap(vehicle =>
    buildMaintenancePlan(vehicle, recordsByPlate[vehicle.plate] ?? [], now).flatMap(item =>
      notificationsFor(vehicle, item, now)
    )
  );
  // Keep it well under the iOS limit of 64 pending local notifications.
  return all.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 40);
}
