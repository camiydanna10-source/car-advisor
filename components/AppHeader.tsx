import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Car, ChevronDown } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface AppHeaderProps {
  /** Name of the logged-in user; its initial is shown in the profile shortcut. */
  userName?: string;
  /** Active vehicle shown as a pill under the logo (home only). */
  vehicleLabel?: string;
  onVehiclePress?: () => void;
  /** Number of pending maintenance alerts shown as a badge on the bell. */
  alertCount?: number;
  onBellPress?: () => void;
}

// Header for the logged-in area. The logo always takes the client back to the home.
export const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  vehicleLabel,
  onVehiclePress,
  alertCount = 0,
  onBellPress,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const initial = userName?.trim().charAt(0).toUpperCase() || '?';

  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <TouchableOpacity
            style={styles.logoRow}
            onPress={() => router.replace('/home')}
            accessibilityRole="button"
            accessibilityLabel="Ir al inicio"
          >
            <Text style={styles.wordmark}>CarAdvisor</Text>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
          </TouchableOpacity>

          {vehicleLabel ? (
            <TouchableOpacity
              style={styles.vehiclePill}
              onPress={onVehiclePress}
              disabled={!onVehiclePress}
              accessibilityLabel="Cambiar de vehículo"
            >
              <Car size={13} color={COLORS.primary} />
              <Text style={styles.vehicleText} numberOfLines={1}>{vehicleLabel}</Text>
              {onVehiclePress ? <ChevronDown size={13} color={COLORS.outline} /> : null}
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.right}>
          {onBellPress ? (
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={onBellPress}
              accessibilityLabel={`Avisos de mantenimiento${alertCount ? `: ${alertCount}` : ''}`}
            >
              <Bell size={19} color={COLORS.onSurfaceVariant} />
              {alertCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{alertCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.replace('/profile')}
            accessibilityLabel="Mi perfil"
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(16, 20, 21, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61, 73, 71, 0.4)',
  },
  row: {
    minHeight: 56,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  left: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  vehicleText: {
    flexShrink: 1,
    color: COLORS.onSurface,
    fontSize: 11,
    fontWeight: '600',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
});
