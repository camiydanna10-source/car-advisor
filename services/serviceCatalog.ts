export type ServiceCategory = 'MECANICA' | 'NEUMATICOS' | 'ESTETICA';

export interface ServiceItem {
  id: string;
  category: ServiceCategory;
  title: string;
  description: string;
  price: number;
  estimatedTime: string;
}

export const SERVICES: ServiceItem[] = [
  {
    id: 's1',
    category: 'MECANICA',
    title: 'Cambio de Aceite & Filtros',
    description: 'Aceite 100% sintético Mobil 1 + filtro de aceite y aire OEM.',
    price: 180,
    estimatedTime: '45 min',
  },
  {
    id: 's2',
    category: 'MECANICA',
    title: 'Diagnóstico Computarizado OBD-II',
    description: 'Escaneo completo de códigos de error de motor, transmisión y frenos.',
    price: 60,
    estimatedTime: '30 min',
  },
  {
    id: 's6',
    category: 'MECANICA',
    title: 'Pre-ITV · Revisión previa a la inspección',
    description:
      'Revisamos luces, frenos, neumáticos, emisiones y holguras para que pases la ITV a la primera.',
    price: 49,
    estimatedTime: '40 min',
  },
  {
    id: 's3',
    category: 'NEUMATICOS',
    title: 'Reparación de Pinchazo & Balanceo',
    description: 'Desmontaje, parche interior vulcanizado y balanceo dinámico.',
    price: 35,
    estimatedTime: '25 min',
  },
  {
    id: 's4',
    category: 'ESTETICA',
    title: 'Valet Service & Lavado Premium',
    description: 'Recogida de auto en domicilio, lavado detallado y entrega con geolocalización.',
    price: 90,
    estimatedTime: '2 horas',
  },
  {
    id: 's5',
    category: 'ESTETICA',
    title: 'Latonería & Pintura Express',
    description: 'Reparación de rayones y abolladuras pequeñas en menos de 24h.',
    price: 250,
    estimatedTime: '24 horas',
  },
];
