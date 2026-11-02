import { SERVICES } from './serviceCatalog';
import type { VehicleData } from './vehicleLookup';

export interface ChecklistItem {
  id: string;
  label: string;
  /** Vehicle-specific reference (oil grade, filter, tyre size…) the mechanic needs at hand. */
  detail?: string;
  done: boolean;
}

// The request flow only carries the service title, so the catalog id is resolved from it.
export function resolveServiceId(title: string): string | undefined {
  const exact = SERVICES.find(s => s.title === title);
  if (exact) return exact.id;
  const t = title.toLowerCase();
  if (t.includes('itv')) return 's6';
  if (t.includes('aceite')) return 's1';
  if (t.includes('obd') || t.includes('diagnóstico')) return 's2';
  if (t.includes('pinchazo') || t.includes('neumático') || t.includes('balanceo')) return 's3';
  return undefined;
}

type Step = [label: string, detail?: string];

function stepsFor(serviceId: string | undefined, serviceTitle: string, v: VehicleData): Step[] {
  switch (serviceId) {
    case 's1':
      return [
        ['Drenar el aceite usado y sustituir el filtro', v.specs.aceite.filtro],
        ['Rellenar con el aceite recomendado', `${v.specs.aceite.tipo} · ${v.specs.aceite.capacidad}`],
        ['Revisar nivel de líquido de frenos y refrigerante'],
        ['Comprobar fugas y apriete del tapón del cárter'],
        ['Restablecer el indicador de mantenimiento'],
      ];
    case 's2':
      return [
        ['Conectar el escáner OBD-II y leer los códigos (DTC)'],
        ['Anotar los códigos activos y su significado'],
        ['Revisar datos en vivo (temperatura, sondas, presión)'],
        ['Borrar códigos solo si se ha reparado la causa'],
        ['Prueba de ruta breve'],
      ];
    case 's6':
      return [
        ['Neumáticos: estado y presión', `${v.specs.neumaticos.medida} · ${v.specs.neumaticos.presion}`],
        ['Frenos: discos y pastillas', v.specs.frenos.discos],
        ['Luces, intermitentes y señalización'],
        ['Emisiones y gases de escape', v.motor],
        ['Dirección, suspensión y holguras'],
        ['Limpiaparabrisas, bocina y cinturones'],
      ];
    case 's3':
      return [
        ['Desmontar la rueda y localizar el pinchazo'],
        ['Reparar o sustituir y equilibrar'],
        ['Ajustar la presión', `${v.specs.neumaticos.medida} · ${v.specs.neumaticos.presion}`],
        ['Montar y apretar con llave dinamométrica'],
      ];
    default:
      return [
        ['Inspección visual previa'],
        ['Realizar el servicio solicitado', serviceTitle],
        ['Prueba final y limpieza'],
      ];
  }
}

export function buildChecklist(serviceTitle: string, vehicle: VehicleData): ChecklistItem[] {
  return stepsFor(resolveServiceId(serviceTitle), serviceTitle, vehicle).map(([label, detail], index) => ({
    id: `step-${index + 1}`,
    label,
    detail,
    done: false,
  }));
}
