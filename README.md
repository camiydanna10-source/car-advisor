# CarAdvisor Mobile

App móvil (Android, iOS y web) de CarAdvisor: asistencia en carretera, catálogo de servicios, Pre-ITV
y seguimiento del mantenimiento del coche. Hecha con Expo SDK 57, React Native y Expo Router.

El backend (Spring Boot) vive en [`backend/`](backend). Este README solo cubre la app.

## Arrancar

```bash
npm install
npx expo start --lan -c   # escanea el QR con Expo Go (el móvil y el PC en la misma red)
```

- La dirección del backend está en `services/config.ts` (`localhost` no sirve desde un móvil físico).
- En desarrollo hay un botón **DEV** con accesos directos a todas las pantallas y una sesión de prueba
  que permite recorrer la zona del cliente sin backend.
- Las notificaciones de mantenimiento **no funcionan en web ni en Expo Go de Android**; necesitan un
  development build (`eas build --profile development`) o la app instalada.

## Estructura

| Carpeta | Contenido |
|---|---|
| `app/` | Pantallas (rutas planas de Expo Router) |
| `components/` | Componentes de UI compartidos |
| `hooks/` | Sesión, GPS, historial de servicios, avisos |
| `services/` | Auth, catálogo, consulta de matrícula, plan de mantenimiento, notificaciones |
| `constants/` | Tokens de diseño (colores, tipografía, espaciado) y accesos DEV |

## Datos simulados

La consulta de matrícula es **simulada** (`lookupVehicle` en `services/vehicleLookup.ts`) hasta que haya un
proveedor de datos. Es el único punto que hay que sustituir: el plan de mantenimiento y los avisos pasan a
usar fechas exactas en cuanto el proveedor devuelva `registrationDate`, `itvLastDate` o `itvDueDate`.

## Comprobaciones

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
