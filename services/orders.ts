import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecordType, toISODate } from './maintenancePlan';
import { ChecklistItem, buildChecklist, resolveServiceId } from './serviceChecklist';
import { addRecord } from './serviceHistoryStorage';
import type { VehicleData } from './vehicleLookup';
import { updateVehicle } from './vehicleStorage';

// STAND-IN FOR THE BACKEND. There is no orders API yet, so service orders and SOS alerts live in
// the device storage, shared by every account on it. That is enough to run the whole flow
// (client requests -> mechanic accepts -> check-in -> checklist -> done -> client timeline) on a
// single phone. The shapes below are the contract the backend should expose (see the commit notes);
// replacing this file by API calls is the only change the screens need.

const ORDERS_KEY = 'car_advisor_orders';
const SOS_KEY = 'car_advisor_sos_alerts';

export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface OrderClient {
  name: string;
  /** Missing for guests (express checkout without an account). */
  email?: string;
  /** International format (+34600111222): the mechanic calls or writes to it. */
  phone?: string;
}

export interface OrderMechanic {
  name: string;
  email: string;
}

export interface ServiceOrder {
  id: string;
  /** Human code shown in the UI, e.g. ORD-0003. */
  code: string;
  status: OrderStatus;
  createdAt: string;
  client: OrderClient;
  /** Snapshot of the vehicle (with the part references the mechanic needs). */
  vehicle: VehicleData;
  service: { id?: string; title: string; price?: number };
  mechanic?: OrderMechanic;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  /** Odometer reading registered by the mechanic when the car arrives. */
  checkIn?: { km: number; at: string };
  checklist: ChecklistItem[];
  diagnosis?: string;
  recommendations?: string;
  extraParts: string[];
}

export interface SosAlert {
  id: string;
  code: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  createdAt: string;
  emergency: { type: string; label: string };
  client: OrderClient;
  vehicle?: { plate: string; brand: string; model: string; color: string };
  location: { latitude: number; longitude: number; accuracy: number | null; address: string | null } | null;
  mapsUrl: string | null;
  mechanic?: OrderMechanic;
  completedAt?: string;
  /** Mechanics (e-mails) that declined it: they stop seeing it, the others still do. */
  rejectedBy: string[];
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

// In-process change notifications: screens (and the SOS alarm) refresh the instant something is
// written instead of waiting for the next poll. The backend equivalent is a WebSocket/push event.
const listeners = new Set<() => void>();
export const onWorkshopChange = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const writeList = async (key: string, list: unknown[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(list));
  listeners.forEach(listener => listener());
};

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const code = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, '0')}`;

// ---- Service orders ----
export const listOrders = () => readList<ServiceOrder>(ORDERS_KEY);

export const getOrder = async (id: string) => (await listOrders()).find(o => o.id === id);

export async function createOrder(input: {
  client: OrderClient;
  vehicle: VehicleData;
  service: { title: string; price?: number };
}): Promise<ServiceOrder> {
  const orders = await listOrders();
  const order: ServiceOrder = {
    id: newId(),
    code: code('ORD', orders.length + 1),
    status: 'pending',
    createdAt: new Date().toISOString(),
    client: input.client,
    vehicle: input.vehicle,
    service: { id: resolveServiceId(input.service.title), ...input.service },
    checklist: buildChecklist(input.service.title, input.vehicle),
    extraParts: [],
  };
  await writeList(ORDERS_KEY, [order, ...orders]);
  return order;
}

async function patchOrder(id: string, patch: (order: ServiceOrder) => ServiceOrder): Promise<ServiceOrder> {
  const orders = await listOrders();
  const current = orders.find(o => o.id === id);
  if (!current) throw new Error('La orden ya no existe.');
  const next = patch(current);
  await writeList(ORDERS_KEY, orders.map(o => (o.id === id ? next : o)));
  return next;
}

export const acceptOrder = (id: string, mechanic: OrderMechanic) =>
  patchOrder(id, order => {
    if (order.status === 'cancelled') throw new Error('El cliente canceló esta solicitud.');
    if (order.status !== 'pending') throw new Error('Otro mecánico ya tomó esta orden.');
    return { ...order, status: 'in_progress', mechanic, acceptedAt: new Date().toISOString() };
  });

// Only while no mechanic has taken it: after that the client has to talk to the mechanic.
export const cancelOrder = (id: string) =>
  patchOrder(id, order => {
    if (order.status !== 'pending') throw new Error('Un mecánico ya aceptó la solicitud: ya no se puede cancelar desde aquí.');
    return { ...order, status: 'cancelled', cancelledAt: new Date().toISOString() };
  });

export const setCheckIn = (id: string, km: number) =>
  patchOrder(id, order => ({ ...order, checkIn: { km, at: new Date().toISOString() } }));

export const toggleChecklistItem = (id: string, itemId: string) =>
  patchOrder(id, order => ({
    ...order,
    checklist: order.checklist.map(item => (item.id === itemId ? { ...item, done: !item.done } : item)),
  }));

export const saveOrderNotes = (
  id: string,
  notes: { diagnosis?: string; recommendations?: string; extraParts?: string[] }
) => patchOrder(id, order => ({ ...order, ...notes }));

// Which timeline entry a finished catalog service leaves in the client's history.
const RECORD_FOR_SERVICE: Record<string, RecordType> = { s1: 'oil', s2: 'diagnostic', s3: 'tires' };

export async function completeOrder(id: string): Promise<ServiceOrder> {
  const order = await patchOrder(id, current => {
    if (current.status !== 'in_progress') throw new Error('La orden no está en proceso.');
    if (!current.checkIn) throw new Error('Registra el kilometraje de entrada antes de finalizar.');
    return { ...current, status: 'completed', completedAt: new Date().toISOString() };
  });

  // Close the loop with the client's timeline: the workshop writes the record and the new odometer.
  if (order.client.email && order.checkIn) {
    await addRecord(order.client.email, {
      plate: order.vehicle.plate,
      type: RECORD_FOR_SERVICE[order.service.id ?? ''] ?? 'odometer',
      date: toISODate(new Date()),
      km: order.checkIn.km,
      source: 'workshop',
      note: order.diagnosis,
    });
    if (order.checkIn.km > order.vehicle.mileage) {
      await updateVehicle(order.client.email, order.vehicle.plate, { mileage: order.checkIn.km });
    }
  }
  return order;
}

// ---- SOS alerts ----
export const listSosAlerts = () => readList<SosAlert>(SOS_KEY);

export async function createSosAlert(
  input: Omit<SosAlert, 'id' | 'code' | 'status' | 'createdAt' | 'rejectedBy' | 'mechanic'>
): Promise<SosAlert> {
  const alerts = await listSosAlerts();
  const alert: SosAlert = {
    ...input,
    id: newId(),
    code: code('SOS', alerts.length + 1),
    status: 'open',
    createdAt: new Date().toISOString(),
    rejectedBy: [],
  };
  await writeList(SOS_KEY, [alert, ...alerts]);
  return alert;
}

async function patchAlert(id: string, patch: (alert: SosAlert) => SosAlert) {
  const alerts = await listSosAlerts();
  await writeList(SOS_KEY, alerts.map(a => (a.id === id ? patch(a) : a)));
}

export const acceptSosAlert = (id: string, mechanic: OrderMechanic) =>
  patchAlert(id, alert => {
    if (alert.status === 'cancelled') throw new Error('El cliente canceló este auxilio.');
    if (alert.status !== 'open') throw new Error('Otro mecánico ya aceptó este auxilio.');
    return { ...alert, status: 'accepted', mechanic };
  });

export const rejectSosAlert = (id: string, mechanicEmail: string) =>
  patchAlert(id, alert => ({ ...alert, rejectedBy: [...new Set([...alert.rejectedBy, mechanicEmail])] }));

export const getSosAlert = async (id: string) => (await listSosAlerts()).find(a => a.id === id);

// The client cancels while nobody has accepted it (the alarm of the mechanics stops).
export const cancelSosAlert = (id: string) =>
  patchAlert(id, alert => (alert.status === 'open' ? { ...alert, status: 'cancelled' } : alert));

// The mechanic closes the roadside assistance once the client has been helped.
export const completeSosAlert = (id: string) =>
  patchAlert(id, alert =>
    alert.status === 'accepted' ? { ...alert, status: 'completed', completedAt: new Date().toISOString() } : alert
  );

// ---- Mechanic shift (available / paused) ----
const shiftKey = (email: string) => `car_advisor_shift:${email.trim().toLowerCase()}`;

export const getShiftActive = async (email: string) => {
  try {
    return (await AsyncStorage.getItem(shiftKey(email))) !== '0';
  } catch {
    return true;
  }
};

export const setShiftActive = (email: string, active: boolean) =>
  AsyncStorage.setItem(shiftKey(email), active ? '1' : '0');

// Dev menu helpers.
export const clearOrdersAndAlerts = () => Promise.all([AsyncStorage.removeItem(ORDERS_KEY), AsyncStorage.removeItem(SOS_KEY)]);

// "hace 5 min" / "hace 2 h" / "12/10/2026"
export function timeAgo(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 60 * 24) return `hace ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString('es-ES');
}
