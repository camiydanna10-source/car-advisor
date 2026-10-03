import { API_BASE } from './config';
import { VehicleData } from './vehicleLookup';

// The backend `Car` entity (POST /api/cars) only stores brand/model/year/price/description,
// so plate, engine, colour and mileage travel inside `description` until it gets dedicated columns.
export interface CreateCarPayload {
  brand: string;
  model: string;
  year: number;
  description: string;
}

export const buildCarPayload = (vehicle: VehicleData): CreateCarPayload => ({
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year,
  description: [
    `Matrícula ${vehicle.plate}`,
    vehicle.motor,
    vehicle.color,
    `${vehicle.mileage.toLocaleString('es-ES')} km`,
    `Titular: ${vehicle.owner}`,
  ].join(' · '),
});

export const createCar = async (vehicle: VehicleData) => {
  try {
    const response = await fetch(`${API_BASE}/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCarPayload(vehicle)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'No se pudo guardar el vehículo');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Error de conexión con el servidor');
  }
};
