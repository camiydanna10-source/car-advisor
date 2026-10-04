import { SERVICES, ServiceItem } from './serviceCatalog';
import type { VehicleData } from './vehicleLookup';

// Maintenance rules for a passenger car in Spain, evaluated from the vehicle's dates and mileage.
//
// Data sources, from most to least exact:
//   1. Dates/history supplied by a data provider (VehicleData.registrationDate / itvLastDate /
//      itvDueDate) or by the workshop (ServiceRecord.source = 'provider' | 'workshop').
//   2. Records entered by the client in the timeline (source = 'user').
//   3. Estimates from the year and mileage only (basis = 'estimated'); these never trigger
//      scheduled notifications, they only feed the in-app suggestions.

export type RecordType = 'itv' | 'oil' | 'tires' | 'diagnostic' | 'odometer';

export interface ServiceRecord {
  id: string;
  plate: string;
  type: RecordType;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** Odometer reading on that date. */
  km: number;
  source: 'user' | 'provider' | 'workshop';
  note?: string;
}

export const RECORD_LABEL: Record<RecordType, string> = {
  itv: 'ITV pasada',
  oil: 'Cambio de aceite y filtros',
  tires: 'Neumáticos (revisión / balanceo)',
  diagnostic: 'Diagnóstico OBD-II',
  odometer: 'Lectura de kilometraje',
};

// ---- Spanish rules (single place to tune them) ----
// ITV (turismos): first inspection 4 years after registration, then every 2 years until the
// vehicle is 10 years old, then every year.
export const ITV_RULES = { firstAfterYears: 4, biennialUntilAge: 10, warnDays: 30, urgentDays: 14 };
// Wear items: manufacturer-typical intervals, whichever comes first (km or months).
export const INTERVALS = {
  oil: { km: 15000, months: 12, warnKm: 1500 },
  tires: { km: 20000, months: 12, warnKm: 2000 },
  diagnostic: { km: 0, months: 12, warnKm: 0 },
} as const;
const WARN_DAYS = 30;

// ---- Date helpers (dates are stored as local yyyy-mm-dd strings) ----
const DAY = 86400000;
const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) result.setDate(0); // Jan 31 + 1 month -> Feb 28/29
  return result;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const daysUntil = (target: Date, now: Date) => Math.round((startOfDay(target) - startOfDay(now)) / DAY);

export const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const fmtKm = (km: number) => `${Math.round(km).toLocaleString('es-ES')} km`;

type Priority = 'high' | 'medium' | 'low';
export type MaintenanceStatus = 'ok' | 'soon' | 'overdue' | 'unknown';
export type MaintenanceBasis = 'registered' | 'estimated';

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const latestRecord = (records: ServiceRecord[], type: RecordType) =>
  records
    .filter(r => r.type === type)
    .sort((a, b) => (a.date === b.date ? b.km - a.km : a.date < b.date ? 1 : -1))[0];

// ---- ITV ----
export interface ItvInfo {
  age: number;
  /** Very short label for compact UI (cards, chips). */
  short: string;
  summary: string;
  priority: Priority;
  status: MaintenanceStatus;
  basis: MaintenanceBasis;
  /** ISO due date when it can be computed from real dates. */
  dueDate?: string;
  remainingDays?: number;
}

type ItvInput = Pick<VehicleData, 'year' | 'registrationDate' | 'itvLastDate' | 'itvDueDate'>;

const ageAt = (vehicle: ItvInput, at: Date) =>
  vehicle.registrationDate
    ? Math.floor(daysUntil(at, parseISODate(vehicle.registrationDate)) / 365.25)
    : at.getFullYear() - vehicle.year;

const nextItvAfter = (vehicle: ItvInput, last: Date) =>
  addMonths(last, ageAt(vehicle, last) >= ITV_RULES.biennialUntilAge ? 12 : 24);

function itvDueDate(vehicle: ItvInput, records: ServiceRecord[], now: Date): Date | null {
  const recordLast = latestRecord(records, 'itv')?.date;
  if (recordLast && (!vehicle.itvLastDate || recordLast > vehicle.itvLastDate)) {
    return nextItvAfter(vehicle, parseISODate(recordLast));
  }
  if (vehicle.itvDueDate) return parseISODate(vehicle.itvDueDate);
  if (vehicle.itvLastDate) return nextItvAfter(vehicle, parseISODate(vehicle.itvLastDate));
  if (vehicle.registrationDate) {
    const first = addMonths(parseISODate(vehicle.registrationDate), ITV_RULES.firstAfterYears * 12);
    // Past the first date with no inspection on record: we cannot tell, fall back to the estimate.
    if (daysUntil(first, now) >= 0) return first;
  }
  return null;
}

export function getItvInfo(vehicle: ItvInput, records: ServiceRecord[] = [], now = new Date()): ItvInfo {
  const age = now.getFullYear() - vehicle.year;
  const due = itvDueDate(vehicle, records, now);

  if (due) {
    const days = daysUntil(due, now);
    const iso = toISODate(due);
    if (days < 0) {
      return {
        age, dueDate: iso, remainingDays: days, basis: 'registered', status: 'overdue', priority: 'high',
        short: 'Vencida',
        summary: `ITV vencida el ${formatDate(due)} (hace ${-days} ${-days === 1 ? 'día' : 'días'}).`,
      };
    }
    const soon = days <= ITV_RULES.warnDays;
    return {
      age, dueDate: iso, remainingDays: days, basis: 'registered',
      status: soon ? 'soon' : 'ok',
      priority: days <= ITV_RULES.urgentDays ? 'high' : soon ? 'medium' : 'low',
      short: days <= 60 ? (days === 0 ? 'Hoy' : `En ${days} d`) : `${pad(due.getMonth() + 1)}/${due.getFullYear()}`,
      summary: days === 0 ? `Tu ITV vence hoy (${formatDate(due)}).` : `Próxima ITV el ${formatDate(due)} (en ${days} días).`,
    };
  }

  // Estimate from the registration year only.
  const base = { age, basis: 'estimated' as const };
  if (age < 3) {
    return { ...base, status: 'ok', priority: 'low', short: `En ~${4 - age} años`, summary: `Primera ITV a los 4 años (en ~${4 - age} años).` };
  }
  if (age < 4) {
    return { ...base, status: 'soon', priority: 'medium', short: 'Próxima', summary: 'Primera ITV próxima: se exige a los 4 años de la matriculación.' };
  }
  if (age <= 10) {
    return { ...base, status: 'unknown', priority: 'high', short: 'Cada 2 años', summary: `ITV cada 2 años (vehículo de ${age} años).` };
  }
  return { ...base, status: 'unknown', priority: 'high', short: 'Anual', summary: `ITV anual (vehículo de ${age} años).` };
}

// ---- Maintenance plan ----
export type MaintenanceKind = 'itv' | 'oil' | 'tires' | 'diagnostic';

export interface MaintenanceItem {
  kind: MaintenanceKind;
  label: string;
  /** Catalog service that solves it (SERVICES id). */
  serviceId: string;
  status: MaintenanceStatus;
  priority: Priority;
  basis: MaintenanceBasis;
  /** ISO due date, when known. */
  dueDate?: string;
  dueKm?: number;
  remainingDays?: number;
  remainingKm?: number;
  /** Short status text for chips ("Vencida", "Faltan 3.500 km"…). */
  headline: string;
  reason: string;
  /** True when a notification should go out as soon as possible (overdue or about to be). */
  reminderNow: boolean;
}

interface IntervalArgs {
  kind: 'oil' | 'tires' | 'diagnostic';
  label: string;
  serviceId: string;
  interval: { km: number; months: number; warnKm: number };
  records: ServiceRecord[];
  currentKm: number;
  now: Date;
  /** What to say when there is no record of the last service (null = nothing to suggest). */
  estimate: (km: number) => { priority: Priority; reason: string } | null;
}

function intervalItem({ kind, label, serviceId, interval, records, currentKm, now, estimate }: IntervalArgs): MaintenanceItem {
  const last = latestRecord(records, kind);

  if (!last) {
    const guess = estimate(currentKm);
    return {
      kind, label, serviceId, basis: 'estimated', reminderNow: false,
      status: guess ? 'unknown' : 'ok',
      priority: guess?.priority ?? 'low',
      headline: 'Sin registro',
      reason: guess?.reason ?? '',
    };
  }

  const dueDate = addMonths(parseISODate(last.date), interval.months);
  const dueKm = interval.km ? last.km + interval.km : undefined;
  const remainingDays = daysUntil(dueDate, now);
  const remainingKm = dueKm === undefined ? undefined : dueKm - currentKm;

  const overdue = remainingDays < 0 || (remainingKm !== undefined && remainingKm <= 0);
  const soon = remainingDays <= WARN_DAYS || (remainingKm !== undefined && remainingKm <= interval.warnKm);
  const status: MaintenanceStatus = overdue ? 'overdue' : soon ? 'soon' : 'ok';

  const lastText = `Último: ${formatDate(last.date)}${last.km ? ` a ${fmtKm(last.km)}` : ''}.`;
  const nextText = dueKm !== undefined
    ? `Toca a los ${fmtKm(dueKm)} o el ${formatDate(dueDate)}, lo que ocurra antes.`
    : `Toca el ${formatDate(dueDate)}.`;

  let headline: string;
  if (overdue) headline = 'Vencido';
  else if (remainingKm !== undefined && (remainingKm <= interval.warnKm || remainingDays > WARN_DAYS)) {
    headline = `Faltan ${fmtKm(remainingKm)}`;
  } else headline = remainingDays === 0 ? 'Hoy' : `En ${remainingDays} d`;

  return {
    kind, label, serviceId, status, basis: 'registered',
    priority: overdue ? 'high' : soon ? 'medium' : 'low',
    dueDate: toISODate(dueDate), dueKm, remainingDays, remainingKm,
    headline, reason: `${lastText} ${nextText}`,
    reminderNow: overdue || soon,
  };
}

export function buildMaintenancePlan(
  vehicle: VehicleData,
  records: ServiceRecord[] = [],
  now = new Date()
): MaintenanceItem[] {
  const currentKm = Math.max(vehicle.mileage, ...records.map(r => r.km));
  const km = fmtKm(currentKm);

  const itv = getItvInfo(vehicle, records, now);
  const itvItem: MaintenanceItem = {
    kind: 'itv', label: 'ITV', serviceId: 's6',
    status: itv.status, priority: itv.priority, basis: itv.basis,
    dueDate: itv.dueDate, remainingDays: itv.remainingDays,
    headline: itv.status === 'unknown' ? 'Sin fecha' : itv.short,
    reason:
      itv.status === 'ok'
        ? itv.summary
        : `${itv.summary} ${itv.status === 'unknown' ? 'Registra la fecha de tu última ITV para recibir el aviso exacto. ' : ''}Pasa la Pre-ITV antes de la inspección oficial.`,
    reminderNow: itv.basis === 'registered' && itv.status === 'overdue',
  };

  const items = [
    itvItem,
    intervalItem({
      kind: 'oil', label: 'Cambio de aceite', serviceId: 's1', interval: INTERVALS.oil, records, currentKm, now,
      estimate: k =>
        k >= 15000
          ? {
              priority: k >= 30000 ? 'high' : 'medium',
              reason: `Tu coche lleva ${km}: el aceite y el filtro se renuevan cada 15.000 km o 12 meses. Registra tu último cambio para un aviso exacto.`,
            }
          : null,
    }),
    intervalItem({
      kind: 'tires', label: 'Neumáticos', serviceId: 's3', interval: INTERVALS.tires, records, currentKm, now,
      estimate: k =>
        k >= 50000
          ? { priority: 'medium', reason: `Con ${km} conviene revisar el estado y el balanceo de los neumáticos.` }
          : null,
    }),
    intervalItem({
      kind: 'diagnostic', label: 'Diagnóstico OBD-II', serviceId: 's2', interval: INTERVALS.diagnostic, records, currentKm, now,
      estimate: () => ({
        priority: 'low',
        reason: 'Un diagnóstico OBD-II detecta fallos de motor, transmisión y frenos antes de que se agraven.',
      }),
    }),
  ];

  return items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

// ---- Suggestions (what the home, the bell and the vehicle setup show) ----
export interface ServiceSuggestion {
  service: ServiceItem;
  reason: string;
  priority: Priority;
}

// Everything that needs attention, plus the optional OBD-II check so the list is never empty.
export function suggestServices(
  vehicle: VehicleData,
  records: ServiceRecord[] = [],
  now = new Date()
): ServiceSuggestion[] {
  return buildMaintenancePlan(vehicle, records, now)
    .filter(item => item.status !== 'ok' || item.kind === 'diagnostic')
    .map(item => ({
      service: SERVICES.find(s => s.id === item.serviceId)!,
      priority: item.priority,
      reason: item.reason,
    }));
}
