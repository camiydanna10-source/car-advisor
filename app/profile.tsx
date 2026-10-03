import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Alert } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Bell, ClipboardCheck, LogOut, Mail, Plus, ShieldCheck } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../hooks/useSession';
import { useServiceHistory } from '../hooks/useServiceHistory';
import {
  NOTIFICATIONS_SUPPORTED,
  clearMaintenanceNotifications,
  getNotificationsEnabled,
  requestPermission,
  setNotificationsEnabled,
  syncMaintenanceNotifications,
} from '../services/notifications';
import { logoutUser } from '../services/authService';
import { formatPlate, getItvInfo } from '../services/vehicleLookup';

export default function ProfileScreen() {
  const router = useRouter();
  const { status, user, vehicles } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);
  const history = useServiceHistory(user?.email, vehicles);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    getNotificationsEnabled(user.email).then(enabled => {
      if (!cancelled) setRemindersOn(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  if (status === 'guest') return <Redirect href="/" />;

  const initial = user?.name?.trim().charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase() || '?';

  const toggleReminders = async (next: boolean) => {
    if (!user) return;
    if (next && !(await requestPermission())) {
      Alert.alert(
        'Permiso de notificaciones',
        'Activa las notificaciones de CarAdvisor en los ajustes del teléfono para recibir los avisos.'
      );
      return;
    }
    await setNotificationsEnabled(user.email, next);
    setRemindersOn(next);
    await syncMaintenanceNotifications(user.email, vehicles, history.byPlate);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await clearMaintenanceNotifications();
    await logoutUser();
    router.replace('/');
  };

  return (
    <>
      <AppHeader userName={user?.name} />
      <ScreenContainer>
        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Cliente CarAdvisor'}</Text>
          <View style={styles.emailRow}>
            <Mail size={14} color={COLORS.onSurfaceVariant} />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Vehicles */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis vehículos</Text>
          <Text style={styles.sectionCount}>{vehicles.length}</Text>
        </View>
        <View style={styles.vehicleList}>
          {vehicles.map(vehicle => {
            const itv = getItvInfo(vehicle, history.byPlate[vehicle.plate] ?? []);
            return (
              <GlassCard key={vehicle.plate} style={styles.vehicleCard}>
                <View style={styles.vehicleTop}>
                  <Text style={styles.vehicleName}>{vehicle.brand} {vehicle.model}</Text>
                  <View style={styles.plateChip}>
                    <Text style={styles.plateText}>{formatPlate(vehicle.plate)}</Text>
                  </View>
                </View>
                <Text style={styles.vehicleMeta}>
                  {vehicle.year} · {vehicle.motor} · {vehicle.color} · {vehicle.mileage.toLocaleString('es-ES')} km
                </Text>
                <View style={styles.itvRow}>
                  <ClipboardCheck size={14} color={COLORS.primary} />
                  <Text style={styles.itvText}>{itv.summary}</Text>
                </View>
              </GlassCard>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            router.push({ pathname: '/register-vehicle', params: { name: user?.name ?? '', mode: 'add' } })
          }
        >
          <Plus size={16} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Añadir otro vehículo</Text>
        </TouchableOpacity>

        {/* Account */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Cuenta</Text>
        <GlassCard style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Bell size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Avisos de mantenimiento</Text>
              <Text style={styles.accountText}>
                {NOTIFICATIONS_SUPPORTED
                  ? 'ITV, cambio de aceite y revisiones, según tu cronología.'
                  : 'No disponible en web ni en Expo Go de Android; funciona en la app instalada.'}
              </Text>
            </View>
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              disabled={!NOTIFICATIONS_SUPPORTED}
              trackColor={{ false: COLORS.surfaceContainerHighest, true: COLORS.primaryContainer }}
              thumbColor={remindersOn ? COLORS.primary : COLORS.outline}
            />
          </View>
        </GlassCard>
        <GlassCard style={styles.accountCard}>
          <View style={styles.accountRow}>
            <ShieldCheck size={18} color={COLORS.success} />
            <Text style={styles.accountText}>
              Sesión protegida: tu acceso se guarda de forma segura en este dispositivo.
            </Text>
          </View>
        </GlassCard>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator color={COLORS.error} />
          ) : (
            <>
              <LogOut size={18} color={COLORS.error} />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </>
          )}
        </TouchableOpacity>
      </ScreenContainer>
      <BottomNav />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  identity: {
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  bigAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarText: {
    color: COLORS.primary,
    fontSize: 30,
    fontFamily: 'Montserrat_700Bold',
  },
  name: {
    ...TYPE.headlineMd,
    color: COLORS.onSurface,
    marginTop: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  email: {
    color: COLORS.onSurfaceVariant,
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  sectionCount: {
    color: COLORS.onPrimary,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 1,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  vehicleList: {
    gap: SPACING.sm,
  },
  vehicleCard: {
    gap: 6,
  },
  vehicleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  vehicleName: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  plateChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D4DC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  plateText: {
    color: '#121212',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  vehicleMeta: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  itvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itvText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  addBtn: {
    marginTop: SPACING.sm,
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(107, 216, 203, 0.4)',
    backgroundColor: 'rgba(107, 216, 203, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  accountCard: {
    marginBottom: SPACING.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchTitle: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  accountText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  logoutBtn: {
    height: 48,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255, 180, 171, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
  },
});
