import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertOctagon, History, Home, ShoppingBag, User } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

const ITEMS = [
  { label: 'Inicio', href: '/home', icon: Home },
  { label: 'Servicios', href: '/catalog', icon: ShoppingBag },
  { label: 'SOS', href: '/sos', icon: AlertOctagon, emergency: true },
  { label: 'Cronología', href: '/timeline', icon: History },
  { label: 'Perfil', href: '/profile', icon: User },
] as const;

// Bottom navigation for the logged-in area. Plain flat routes (no Expo Router tabs):
// each item replaces the current screen so the history does not pile up.
export const BottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {ITEMS.map(item => {
        const Icon = item.icon;
        const active = pathname === item.href;
        const emergency = 'emergency' in item && item.emergency;
        return (
          <TouchableOpacity
            key={item.href}
            style={styles.item}
            onPress={() => router.replace(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
          >
            {emergency ? (
              <View style={[styles.sosBadge, active && styles.sosBadgeActive]}>
                <Icon size={26} color="#FFF" />
              </View>
            ) : (
              <Icon size={22} color={active ? COLORS.primary : COLORS.onSurfaceVariant} />
            )}
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
                emergency && { color: COLORS.tertiary },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 20, 21, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(61, 73, 71, 0.4)',
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    minHeight: 48,
  },
  label: {
    color: COLORS.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: COLORS.primary,
  },
  sosBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tertiaryContainer,
    borderWidth: 4,
    borderColor: COLORS.background,
    ...SHADOWS.sos,
  },
  sosBadgeActive: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});
