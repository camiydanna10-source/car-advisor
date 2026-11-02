import type { Href } from 'expo-router';

export interface DevRoute {
  label: string;
  description: string;
  href: Href;
}

export interface DevRouteGroup {
  title: string;
  routes: DevRoute[];
}

// Shortcuts shown in the dev-mode modal. Add every new screen here so it can be
// reached directly while the frontend is still being assembled.
export const DEV_ROUTE_GROUPS: DevRouteGroup[] = [
  {
    title: 'Acceso y registro',
    routes: [
      { label: 'Iniciar sesión', description: '/', href: '/' },
      { label: 'Registro de cuenta', description: '/register', href: '/register' },
      {
        label: 'Paso 2 · Registro del vehículo',
        description: 'Éxito de registro + matrícula + servicios',
        href: { pathname: '/register-vehicle', params: { name: 'Carlos Sainz' } },
      },
      {
        label: 'Registro del vehículo · login sin vehículo',
        description: 'Variante "Falta un último paso" (mode=complete)',
        href: { pathname: '/register-vehicle', params: { name: 'Carlos Sainz', mode: 'complete' } },
      },
    ],
  },
  {
    title: 'Zona del cliente (requiere sesión)',
    routes: [
      { label: 'Inicio · panel del cliente', description: 'Vehículo, accesos rápidos y servicios', href: '/home' },
      { label: 'Cronología', description: 'Estado del mantenimiento + historial', href: '/timeline' },
      { label: 'Perfil', description: 'Datos, vehículos y cerrar sesión', href: '/profile' },
      {
        label: 'Añadir otro vehículo',
        description: 'Variante desde el perfil (mode=add)',
        href: { pathname: '/register-vehicle', params: { name: 'Carlos Sainz', mode: 'add' } },
      },
    ],
  },
  {
    title: 'Modo invitado (sin registro)',
    routes: [
      { label: 'Asistencia SOS', description: 'GPS + tipo de emergencia', href: '/sos' },
      { label: 'Catálogo de servicios', description: 'Incluye Pre-ITV', href: '/catalog' },
    ],
  },
  {
    title: 'Solicitud de servicio (matrícula precargada)',
    routes: [
      {
        label: 'Pre-ITV · Seat León (1234ABC)',
        description: 'Vehículo de 4 años: ITV exigible',
        href: {
          pathname: '/request-service',
          params: {
            serviceTitle: 'Pre-ITV · Revisión previa a la inspección',
            servicePrice: '49',
            plate: '1234ABC',
          },
        },
      },
      {
        label: 'Cambio de aceite · Mazda CX-5 (9876KMT)',
        description: 'Referencia de filtro y aceite',
        href: {
          pathname: '/request-service',
          params: {
            serviceTitle: 'Cambio de Aceite & Filtros',
            servicePrice: '180',
            plate: '9876KMT',
          },
        },
      },
      {
        label: 'Solicitud sin matrícula',
        description: 'Formulario vacío para probar la consulta',
        href: {
          pathname: '/request-service',
          params: { serviceTitle: 'Diagnóstico Computarizado OBD-II', servicePrice: '60' },
        },
      },
    ],
  },
];

export const DEMO_PLATES = ['9876KMT', '1234ABC', '4521LPN'];
