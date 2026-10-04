import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleData } from './vehicleLookup';

// Local copy of the client's registered vehicles, keyed by e-mail.
// The backend `GET /api/cars` is not scoped to a user yet, so this is what lets the
// logged-in screens know which vehicle(s) belong to the client (see backend notes in the commits).
const keyFor = (email: string) => `car_advisor_vehicles:${email.trim().toLowerCase()}`;

export const getVehicles = async (email: string): Promise<VehicleData[]> => {
  try {
    const raw = await AsyncStorage.getItem(keyFor(email));
    return raw ? (JSON.parse(raw) as VehicleData[]) : [];
  } catch {
    return [];
  }
};

// Adds the vehicle (or replaces it when the plate is already registered) and puts it first.
export const saveVehicle = async (email: string, vehicle: VehicleData): Promise<VehicleData[]> => {
  const current = await getVehicles(email);
  const next = [vehicle, ...current.filter(v => v.plate !== vehicle.plate)];
  await AsyncStorage.setItem(keyFor(email), JSON.stringify(next));
  return next;
};

// Updates fields of a saved vehicle (e.g. the odometer) keeping its position in the list.
export const updateVehicle = async (
  email: string,
  plate: string,
  patch: Partial<VehicleData>
): Promise<VehicleData[]> => {
  const next = (await getVehicles(email)).map(v => (v.plate === plate ? { ...v, ...patch } : v));
  await AsyncStorage.setItem(keyFor(email), JSON.stringify(next));
  return next;
};

// The first vehicle in the list is the active one; this moves an already saved vehicle to the front.
export const setActiveVehicle = async (email: string, plate: string): Promise<VehicleData[]> => {
  const current = await getVehicles(email);
  const chosen = current.find(v => v.plate === plate);
  if (!chosen) return current;
  return saveVehicle(email, chosen);
};
