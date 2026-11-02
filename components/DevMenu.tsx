import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Code2 } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { BottomSheet } from './BottomSheet';
import { DEMO_PLATES, DEV_ROUTE_GROUPS, DevRoute } from '../constants/devRoutes';
import { getUserInfo, logoutUser, persistSession } from '../services/authService';
import { addMonths, toISODate } from '../services/maintenancePlan';
import { addRecord, clearRecords } from '../services/serviceHistoryStorage';
import { clearMaintenanceNotifications } from '../services/notifications';
import { lookupVehicle } from '../services/vehicleLookup';
import { getVehicles, saveVehicle } from '../services/vehicleStorage';

const DEMO_USER = { name: 'Carlos Sainz', email: 'carlos.demo@caradvisor.dev' };

// Session helpers for the dev menu. The token is a placeholder (NOT a real JWT): it only lets
// the logged-in screens be reached without a running backend.
const DEV_ACTIONS: { label: string; description: string; run: () => Promise<string> }[] = [
  {
    label: 'Cargar sesión demo con vehículo',
    description: 'Carlos Sainz + Mazda CX-5 (9876KMT) guardados en este dispositivo',
    run: async () => {
      await persistSession('dev-token', DEMO_USER);
      await saveVehicle(DEMO_USER.email, await lookupVehicle('9876KMT'));
      return '/home';
    },
  },
  {
    label: 'Cargar sesión demo sin vehículo',
    description: 'Para probar el paso "Falta un último paso"',
    run: async () => {
      await persistSession('dev-token', { name: 'Laura Pérez', email: 'laura.demo@caradvisor.dev' });
      return '/home';
    },
  },
  {
    label: 'Cargar historial de prueba',
    description: 'Al vehículo activo: aceite vencido, neumáticos al día e ITV en 20 días (solo desarrollo)',
    run: async () => {
      const user = await getUserInfo();
      const vehicle = user ? (await getVehicles(user.email))[0] : undefined;
      if (!user || !vehicle) return '/';
      const today = new Date();
      const plate = vehicle.plate;
      await clearRecords(user.email, plate);
      const itvDate = new Date(addMonths(today, -24).getTime() + 20 * 86400000);
      await addRecord(user.email, { plate, type: 'itv', date: toISODate(itvDate), km: Math.max(vehicle.mileage - 25000, 0) });
      await addRecord(user.email, { plate, type: 'oil', date: toISODate(addMonths(today, -14)), km: Math.max(vehicle.mileage - 17000, 0) });
      await addRecord(user.email, { plate, type: 'tires', date: toISODate(addMonths(today, -2)), km: Math.max(vehicle.mileage - 3000, 0) });
      return '/timeline';
    },
  },
  {
    label: 'Borrar historial de prueba',
    description: 'Elimina los registros de servicio del vehículo activo',
    run: async () => {
      const user = await getUserInfo();
      const vehicle = user ? (await getVehicles(user.email))[0] : undefined;
      if (user && vehicle) await clearRecords(user.email, vehicle.plate);
      return '/timeline';
    },
  },
  {
    label: 'Cerrar sesión',
    description: 'Borra el token y vuelve al login',
    run: async () => {
      await clearMaintenanceNotifications();
      await logoutUser();
      return '/';
    },
  },
];

// Floating "DEV" button + modal with shortcuts to every screen, so the frontend can keep
// being built without replaying login/registration each time. Only rendered in development
// builds (`__DEV__`), so it never ships to production.
export const DevMenu: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!__DEV__) return null;

  const go = (route: DevRoute) => {
    setVisible(false);
    router.push(route.href);
  };

  const runAction = async (action: (typeof DEV_ACTIONS)[number]) => {
    const target = await action.run();
    setVisible(false);
    router.replace(target as '/');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 76 }]}
        onPress={() => setVisible(true)}
        accessibilityLabel="Abrir menú de desarrollo"
        activeOpacity={0.85}
      >
        <Code2 size={14} color={COLORS.onPrimary} />
        <Text style={styles.fabText}>DEV</Text>
      </TouchableOpacity>

      <BottomSheet
        visible={visible}
        onClose={() => setVisible(false)}
        title="Modo desarrollo"
        subtitle={`Pantalla actual: ${pathname}`}
      >
            <View style={styles.group}>
              <Text style={styles.groupTitle}>SESIÓN DE PRUEBA</Text>
              {DEV_ACTIONS.map(action => (
                <TouchableOpacity key={action.label} style={styles.row} onPress={() => runAction(action)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{action.label}</Text>
                    <Text style={styles.rowDescription}>{action.description}</Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </View>

            {DEV_ROUTE_GROUPS.map(group => (
              <View key={group.title} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
                {group.routes.map(route => (
                  <TouchableOpacity key={route.label} style={styles.row} onPress={() => go(route)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{route.label}</Text>
                      <Text style={styles.rowDescription}>{route.description}</Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.onSurfaceVariant} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.group}>
              <Text style={styles.groupTitle}>MATRÍCULAS DE DEMOSTRACIÓN</Text>
              <Text style={styles.rowDescription}>
                {DEMO_PLATES.join('  ·  ')} — cualquier otra devuelve un vehículo genérico.
              </Text>
            </View>
                </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    opacity: 0.92,
  },
  fabText: {
    color: COLORS.onPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  group: {
    gap: 6,
  },
  groupTitle: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabel: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  rowDescription: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
});
