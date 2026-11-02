import { getItvInfo } from './maintenancePlan';

// ITV rules and the maintenance plan live in maintenancePlan.ts; re-exported for existing imports.
export { getItvInfo, suggestServices } from './maintenancePlan';
export type { ItvInfo, ServiceSuggestion } from './maintenancePlan';

// Per-vehicle technical specs — the exact part/accessory references a
// mechanic needs to have ready, keyed by maintenance area.
export interface VehiclePartSpecs {
  aceite: { tipo: string; filtro: string; capacidad: string };
  frenos: { pastillasDelanteras: string; pastillasTraseras: string; discos: string };
  neumaticos: { medida: string; presion: string };
  bateria: { tipo: string };
  distribucion: { tipo: string; proximoCambioKm: number };
}

export interface VehicleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  motor: string;
  color: string;
  mileage: number;
  owner: string;
  specs: VehiclePartSpecs;
  // Dates (ISO yyyy-mm-dd). The simulated lookup does not return them; a real data provider
  // will, and the maintenance plan / notifications switch to exact dates as soon as they exist.
  registrationDate?: string;
  itvLastDate?: string;
  itvDueDate?: string;
}

type VehicleRecord = Omit<VehicleData, 'plate'>;

// DEMO DATA — there is no public registry API (DGT access is restricted to public
// administrations). `lookupVehicle` is the single place to swap for a real
// provider (MyCarPlate / APIVehículo / InfoCoche) once a backend proxy exists.
const MOCK_VEHICLE_DB: Record<string, VehicleRecord> = {
  '9876KMT': {
    brand: 'Mazda', model: 'CX-5 Touring', year: 2023, motor: 'Híbrido (ECO)',
    color: 'Gris Titanio', mileage: 48250, owner: 'Carlos Sainz',
    specs: {
      aceite: { tipo: '0W-20 Sintético', filtro: 'OEM Mazda PE01-14-302', capacidad: '4.5 L' },
      frenos: { pastillasDelanteras: 'Akebono ACT-1234', pastillasTraseras: 'Akebono ACT-5678', discos: 'Ventilados 320mm' },
      neumaticos: { medida: '225/65 R17', presion: '32 PSI' },
      bateria: { tipo: '12V 70Ah AGM Start-Stop' },
      distribucion: { tipo: 'Cadena (sin mantenimiento programado)', proximoCambioKm: 0 },
    },
  },
  '1234ABC': {
    brand: 'Seat', model: 'León FR', year: 2022, motor: 'Gasolina',
    color: 'Rojo Cristal', mileage: 32100, owner: 'María García',
    specs: {
      aceite: { tipo: '5W-40 Sintético', filtro: 'Bosch 0451103316', capacidad: '4.3 L' },
      frenos: { pastillasDelanteras: 'Brembo P85020', pastillasTraseras: 'Brembo P85021', discos: 'Ventilados 312mm' },
      neumaticos: { medida: '225/40 R18', presion: '34 PSI' },
      bateria: { tipo: '12V 60Ah' },
      distribucion: { tipo: 'Correa dentada', proximoCambioKm: 90000 },
    },
  },
  '4521LPN': {
    brand: 'Volkswagen', model: 'Golf GTD', year: 2021, motor: 'Diésel',
    color: 'Negro Perlado', mileage: 61500, owner: 'Andrés Morales',
    specs: {
      aceite: { tipo: '5W-30 Longlife', filtro: 'Mann HU7008z', capacidad: '4.6 L' },
      frenos: { pastillasDelanteras: 'TRW GDB1330', pastillasTraseras: 'TRW GDB1331', discos: '288mm' },
      neumaticos: { medida: '225/45 R17', presion: '36 PSI' },
      bateria: { tipo: '12V 90Ah AGM' },
      distribucion: { tipo: 'Correa + bomba de agua', proximoCambioKm: 150000 },
    },
  },
};

const GENERIC_FALLBACK: VehicleRecord = {
  brand: 'Toyota', model: 'Corolla', year: 2022, motor: 'Gasolina',
  color: 'Blanco Nieve', mileage: 39800, owner: 'Piloto CarAdvisor',
  specs: {
    aceite: { tipo: '0W-16 Sintético Toyota Genuine', filtro: 'Toyota 04152-37010', capacidad: '4.0 L' },
    frenos: { pastillasDelanteras: 'Akebono ACT-0099', pastillasTraseras: 'Akebono ACT-0100', discos: '282mm' },
    neumaticos: { medida: '205/55 R16', presion: '32 PSI' },
    bateria: { tipo: '12V 50Ah' },
    distribucion: { tipo: 'Cadena (sin mantenimiento programado)', proximoCambioKm: 0 },
  },
};

export const normalizePlate = (plate: string) => plate.replace(/\s|-/g, '').toUpperCase();

export const isPlateValid = (plate: string) => normalizePlate(plate).length >= 6;

export const lookupVehicle = (plate: string): Promise<VehicleData> =>
  new Promise(resolve => {
    const clean = normalizePlate(plate);
    setTimeout(() => resolve({ plate: clean, ...(MOCK_VEHICLE_DB[clean] ?? GENERIC_FALLBACK) }), 1200);
  });

// Which part/accessory block is relevant to the selected catalog service.
export function getRequiredPart(vehicle: VehicleData, serviceTitle: string) {
  const s = serviceTitle.toLowerCase();
  if (s.includes('itv')) {
    return {
      label: 'Pre-ITV',
      items: [
        { k: 'Neumáticos', v: `${vehicle.specs.neumaticos.medida} · ${vehicle.specs.neumaticos.presion}` },
        { k: 'Frenos (disco)', v: vehicle.specs.frenos.discos },
        { k: 'Emisiones', v: vehicle.motor },
        { k: 'Estado ITV', v: getItvInfo(vehicle).summary },
      ],
    };
  }
  if (s.includes('aceite')) {
    return {
      label: 'Cambio de Aceite & Filtro',
      items: [
        { k: 'Aceite recomendado', v: vehicle.specs.aceite.tipo },
        { k: 'Filtro de aceite', v: vehicle.specs.aceite.filtro },
        { k: 'Capacidad', v: vehicle.specs.aceite.capacidad },
      ],
    };
  }
  if (s.includes('freno') || s.includes('pastilla')) {
    return {
      label: 'Frenos',
      items: [
        { k: 'Pastillas delanteras', v: vehicle.specs.frenos.pastillasDelanteras },
        { k: 'Pastillas traseras', v: vehicle.specs.frenos.pastillasTraseras },
        { k: 'Discos', v: vehicle.specs.frenos.discos },
      ],
    };
  }
  if (s.includes('neumático') || s.includes('pinchazo') || s.includes('balanceo')) {
    return {
      label: 'Neumáticos',
      items: [
        { k: 'Medida', v: vehicle.specs.neumaticos.medida },
        { k: 'Presión recomendada', v: vehicle.specs.neumaticos.presion },
      ],
    };
  }
  if (s.includes('batería')) {
    return {
      label: 'Batería',
      items: [{ k: 'Tipo requerido', v: vehicle.specs.bateria.tipo }],
    };
  }
  if (s.includes('obd') || s.includes('diagnóstico')) {
    return {
      label: 'Diagnóstico Computarizado',
      items: [
        { k: 'Motor', v: vehicle.motor },
        { k: 'Distribución', v: vehicle.specs.distribucion.tipo },
      ],
    };
  }
  return null;
}

// "1234ABC" -> "1234 ABC" (current Spanish format); anything else is returned untouched.
export const formatPlate = (plate: string) => {
  const clean = normalizePlate(plate);
  return /^\d{4}[A-Z]{3}$/.test(clean) ? `${clean.slice(0, 4)} ${clean.slice(4)}` : clean;
};

const COLOR_HEX: Record<string, string> = {
  'Gris Titanio': '#595D63',
  'Blanco Nieve': '#F0F3F6',
  'Negro Perlado': '#141517',
  'Rojo Cristal': '#A61C1E',
  'Azul Índigo': '#1D3557',
};

// Swatch colour for the vehicle's registered paint name (neutral grey when unknown).
export const colorHex = (name: string) => COLOR_HEX[name] ?? '#8A939B';
