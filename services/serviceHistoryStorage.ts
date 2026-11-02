import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceRecord } from './maintenancePlan';

// Local service history per client and vehicle (ITV passed, oil changes, tyres, odometer readings…).
// Until the backend stores it (see commit notes) this is the single source for the timeline and
// for the maintenance notifications. A data provider or the workshop can write the same shape
// with source 'provider' / 'workshop'.
const keyFor = (email: string, plate: string) =>
  `car_advisor_history:${email.trim().toLowerCase()}:${plate}`;

export const getRecords = async (email: string, plate: string): Promise<ServiceRecord[]> => {
  try {
    const raw = await AsyncStorage.getItem(keyFor(email, plate));
    return raw ? (JSON.parse(raw) as ServiceRecord[]) : [];
  } catch {
    return [];
  }
};

export const getAllRecords = async (
  email: string,
  plates: string[]
): Promise<Record<string, ServiceRecord[]>> => {
  const entries = await Promise.all(plates.map(async plate => [plate, await getRecords(email, plate)] as const));
  return Object.fromEntries(entries);
};

export const addRecord = async (
  email: string,
  record: Omit<ServiceRecord, 'id' | 'source'> & { source?: ServiceRecord['source'] }
): Promise<ServiceRecord[]> => {
  const current = await getRecords(email, record.plate);
  const created: ServiceRecord = {
    source: 'user',
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const next = [created, ...current];
  await AsyncStorage.setItem(keyFor(email, record.plate), JSON.stringify(next));
  return next;
};

export const deleteRecord = async (email: string, plate: string, id: string): Promise<ServiceRecord[]> => {
  const next = (await getRecords(email, plate)).filter(r => r.id !== id);
  await AsyncStorage.setItem(keyFor(email, plate), JSON.stringify(next));
  return next;
};

export const clearRecords = (email: string, plate: string) => AsyncStorage.removeItem(keyFor(email, plate));
